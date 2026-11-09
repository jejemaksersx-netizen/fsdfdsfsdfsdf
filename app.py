import asyncio
import hashlib
import hmac
import json
import random
from contextlib import asynccontextmanager
from urllib.parse import parse_qsl

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import BigInteger, Column, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# --- НАСТРОЙКИ ---
BOT_TOKEN = "9252975623:AAFvoNDzGBT0Awj2Ekp80CQRVSaooxEsUDQ"
ADMIN_ID = 7554546588
WEBAPP_URL = "https://jejemaksersx-netizen.github.io/fsdfdsfsdfsdf/"

# --- БАЗА ДАННЫХ ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./reaperbet.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(BigInteger, unique=True, index=True)
    username = Column(String, default="")
    first_name = Column(String, default="")
    balance = Column(BigInteger, default=1000) # Стартовый баланс
    is_admin = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ТЕЛЕГРАМ БОТ ---
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎰 Открыть ReaperBet", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    await message.answer("Добро пожаловать в ReaperBet. Твой азарт. Твоя игра.", reply_markup=kb)

# --- API (FASTAPI) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Запуск бота при старте сервера
    asyncio.create_task(dp.start_polling(bot))
    yield
    await bot.session.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Для теста. Потом замени на "https://jejemaksersx-netizen.github.io"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_telegram_data(init_data: str) -> dict:
    try:
        parsed_data = dict(parse_qsl(init_data))
        if "hash" not in parsed_data: return None
        hash_ = parsed_data.pop('hash')
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if calculated_hash == hash_:
            return json.loads(parsed_data["user"])
    except Exception:
        return None
    return None

class InitRequest(BaseModel):
    initData: str

@app.post("/api/auth")
def auth(request: InitRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(request.initData)
    if not user_data:
        raise HTTPException(status_code=403, detail="Invalid auth")
    
    tg_id = user_data["id"]
    user = db.query(User).filter(User.tg_id == tg_id).first()
    if not user:
        is_admin = 1 if tg_id == ADMIN_ID else 0
        user = User(tg_id=tg_id, username=user_data.get("username", ""), first_name=user_data.get("first_name", ""), balance=1000, is_admin=is_admin)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"id": user.tg_id, "balance": user.balance, "is_admin": bool(user.is_admin), "first_name": user.first_name, "username": user.username}

# --- ЛОГИКА MINES ---
active_games = {}

class StartMinesRequest(BaseModel):
    initData: str
    bet: int
    mines: int

@app.post("/api/game/mines/start")
def start_mines(req: StartMinesRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    
    user = db.query(User).filter(User.tg_id == user_data["id"]).first()
    if user.balance < req.bet:
        raise HTTPException(status_code=400, detail="Недостаточно средств")
    if req.mines < 1 or req.mines > 24:
        raise HTTPException(status_code=400, detail="Мин должно быть от 1 до 24")
        
    user.balance -= req.bet
    db.commit()
    
    all_cells = list(range(25))
    mine_positions = random.sample(all_cells, req.mines)
    
    active_games[user.tg_id] = {
        "bet": req.bet,
        "mines": mine_positions,
        "safe_opened": 0,
        "total_mines": req.mines
    }
    
    return {"balance": user.balance}

class ClickCellRequest(BaseModel):
    initData: str
    cell_index: int

@app.post("/api/game/mines/click")
def click_cell(req: ClickCellRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    
    tg_id = user_data["id"]
    if tg_id not in active_games:
        raise HTTPException(status_code=400, detail="Игра не найдена")
        
    game = active_games[tg_id]
    
    if req.cell_index in game["mines"]:
        del active_games[tg_id]
        user = db.query(User).filter(User.tg_id == tg_id).first()
        return {"status": "mine", "balance": user.balance}
    
    game["safe_opened"] += 1
    
    multiplier = (25 / (25 - game["total_mines"])) ** game["safe_opened"]
    current_win = int(game["bet"] * multiplier)
    
    if game["safe_opened"] == (25 - game["total_mines"]):
        user = db.query(User).filter(User.tg_id == tg_id).first()
        user.balance += current_win
        db.commit()
        del active_games[tg_id]
        return {"status": "win", "balance": user.balance, "amount": current_win}
        
    return {"status": "safe", "multiplier": round(multiplier, 2), "current_win": current_win}

class CashoutRequest(BaseModel):
    initData: str

@app.post("/api/game/mines/cashout")
def cashout(req: CashoutRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    
    tg_id = user_data["id"]
    if tg_id not in active_games:
        raise HTTPException(status_code=400, detail="Игра не найдена")
        
    game = active_games[tg_id]
    if game["safe_opened"] == 0:
        raise HTTPException(status_code=400, detail="Сначала откройте клетку")
        
    multiplier = (25 / (25 - game["total_mines"])) ** game["safe_opened"]
    current_win = int(game["bet"] * multiplier)
    
    user = db.query(User).filter(User.tg_id == tg_id).first()
    user.balance += current_win
    db.commit()
    del active_games[tg_id]
    
    return {"status": "cashed_out", "balance": user.balance, "amount": current_win}

# --- АДМИНКА ---
class AdminGiveRequest(BaseModel):
    initData: str
    target_tg_id: int
    amount: int

@app.post("/api/admin/give")
def admin_give(req: AdminGiveRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data or user_data["id"] != ADMIN_ID:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
        
    target = db.query(User).filter(User.tg_id == req.target_tg_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Юзер не найден")
        
    target.balance += req.amount
    db.commit()
    return {"status": "ok", "new_balance": target.balance}

# --- ЗАПУСК ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
