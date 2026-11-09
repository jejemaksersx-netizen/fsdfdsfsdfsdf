import asyncio
import hashlib
import hmac
import json
import os
import random
import time
from urllib.parse import parse_qsl

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import BigInteger, Column, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

BOT_TOKEN = "9252975623:AAFvoNDzGBT0Awj2Ekp80CQRVSaooxEsUDQ"
ADMIN_ID = 7554546588
WEBAPP_URL = "https://jejemaksersx-netizen.github.io/fsdfdsfsdfsdf/"

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
    balance = Column(BigInteger, default=1000)
    is_admin = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎰 Открыть ReaperBet", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    await message.answer("Добро пожаловать в ReaperBet. Твой азарт. Твоя игра.", reply_markup=kb)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    if not user_data: raise HTTPException(status_code=403, detail="Invalid auth")
    tg_id = user_data["id"]
    user = db.query(User).filter(User.tg_id == tg_id).first()
    if not user:
        is_admin = 1 if tg_id == ADMIN_ID else 0
        user = User(tg_id=tg_id, username=user_data.get("username", ""), first_name=user_data.get("first_name", ""), balance=1000, is_admin=is_admin)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"id": user.tg_id, "balance": user.balance, "is_admin": bool(user.is_admin), "first_name": user.first_name, "username": user.username}

active_mines = {}

class StartMinesRequest(BaseModel):
    initData: str
    bet: int
    mines: int

@app.post("/api/game/mines/start")
def start_mines(req: StartMinesRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    user = db.query(User).filter(User.tg_id == user_data["id"]).first()
    if user.balance < req.bet: raise HTTPException(status_code=400, detail="Недостаточно средств")
    if req.mines < 1 or req.mines > 24: raise HTTPException(status_code=400, detail="Мин от 1 до 24")
    user.balance -= req.bet
    db.commit()
    mine_positions = random.sample(list(range(25)), req.mines)
    active_mines[user.tg_id] = {"bet": req.bet, "mines": mine_positions, "safe_opened": 0, "total_mines": req.mines}
    return {"balance": user.balance}

class ClickMinesRequest(BaseModel):
    initData: str
    cell_index: int

@app.post("/api/game/mines/click")
def click_mines(req: ClickMinesRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    tg_id = user_data["id"]
    if tg_id not in active_mines: raise HTTPException(status_code=400, detail="Игра не найдена")
    game = active_mines[tg_id]
    if req.cell_index in game["mines"]:
        del active_mines[tg_id]
        user = db.query(User).filter(User.tg_id == tg_id).first()
        return {"status": "mine", "balance": user.balance}
    game["safe_opened"] += 1
    multiplier = (25 / (25 - game["total_mines"])) ** game["safe_opened"]
    current_win = int(game["bet"] * multiplier)
    if game["safe_opened"] == (25 - game["total_mines"]):
        user = db.query(User).filter(User.tg_id == tg_id).first()
        user.balance += current_win
        db.commit()
        del active_mines[tg_id]
        return {"status": "win", "balance": user.balance, "amount": current_win}
    return {"status": "safe", "multiplier": round(multiplier, 2), "current_win": current_win}

class CashoutRequest(BaseModel):
    initData: str

@app.post("/api/game/mines/cashout")
def cashout_mines(req: CashoutRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    tg_id = user_data["id"]
    if tg_id not in active_mines: raise HTTPException(status_code=400, detail="Игра не найдена")
    game = active_mines[tg_id]
    if game["safe_opened"] == 0: raise HTTPException(status_code=400, detail="Сначала откройте клетку")
    multiplier = (25 / (25 - game["total_mines"])) ** game["safe_opened"]
    current_win = int(game["bet"] * multiplier)
    user = db.query(User).filter(User.tg_id == tg_id).first()
    user.balance += current_win
    db.commit()
    del active_mines[tg_id]
    return {"status": "cashed_out", "balance": user.balance, "amount": current_win}

active_crashes = {}

class StartCrashRequest(BaseModel):
    initData: str
    bet: int

@app.post("/api/game/crash/start")
def start_crash(req: StartCrashRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    user = db.query(User).filter(User.tg_id == user_data["id"]).first()
    if user.balance < req.bet: raise HTTPException(status_code=400, detail="Недостаточно средств")
    user.balance -= req.bet
    db.commit()
    crash_point = round(1.0 + random.expovariate(1.5), 2)
    if crash_point < 1.1: crash_point = 1.1
    active_crashes[user.tg_id] = {"bet": req.bet, "crash_point": crash_point}
    return {"balance": user.balance}

class CrashCheckRequest(BaseModel):
    initData: str
    current_multiplier: float

@app.post("/api/game/crash/check")
def check_crash(req: CrashCheckRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    tg_id = user_data["id"]
    if tg_id not in active_crashes: return {"status": "crashed", "crash_point": 1.0}
    game = active_crashes[tg_id]
    if req.current_multiplier >= game["crash_point"]:
        del active_crashes[tg_id]
        return {"status": "crashed", "crash_point": game["crash_point"]}
    return {"status": "ok"}

class CashoutCrashRequest(BaseModel):
    initData: str
    current_multiplier: float

@app.post("/api/game/crash/cashout")
def cashout_crash(req: CashoutCrashRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    tg_id = user_data["id"]
    if tg_id not in active_crashes: raise HTTPException(status_code=400, detail="Игра не найдена")
    game = active_crashes[tg_id]
    if req.current_multiplier >= game["crash_point"]:
        del active_crashes[tg_id]
        return {"status": "crashed"}
    win_amount = int(game["bet"] * req.current_multiplier)
    user = db.query(User).filter(User.tg_id == tg_id).first()
    user.balance += win_amount
    db.commit()
    del active_crashes[tg_id]
    return {"status": "cashed_out", "amount": win_amount, "balance": user.balance}

SLOT_SYMBOLS = {
    'skull': {'weight': 15, 'pay3': 10},
    'scythe': {'weight': 20, 'pay3': 15},
    'potion': {'weight': 25, 'pay3': 20},
    'eye': {'weight': 20, 'pay3': 25},
    'coin': {'weight': 15, 'pay3': 40},
    'wild': {'weight': 5, 'pay3': 100}
}

class StartSlotsRequest(BaseModel):
    initData: str
    bet: int

@app.post("/api/game/slots/spin")
def spin_slots(req: StartSlotsRequest, db: Session = Depends(get_db)):
    user_data = verify_telegram_data(req.initData)
    if not user_data: raise HTTPException(status_code=403)
    user = db.query(User).filter(User.tg_id == user_data["id"]).first()
    if user.balance < req.bet: raise HTTPException(status_code=400, detail="Недостаточно средств")
    user.balance -= req.bet
    db.commit()
    pool = []
    for sym, data in SLOT_SYMBOLS.items():
        pool.extend([sym] * data['weight'])
    grid = []
    for _ in range(3):
        col = [random.choice(pool) for _ in range(3)]
        grid.append(col)
    total_win = 0
    winning_lines = []
    lines_to_check = [(0, 1, 2), (3, 4, 5), (6, 7, 8)]
    flat_grid = [grid[0][0], grid[1][0], grid[2][0], grid[0][1], grid[1][1], grid[2][1], grid[0][2], grid[1][2], grid[2][2]]
    for i, line in enumerate(lines_to_check):
        s1, s2, s3 = flat_grid[line[0]], flat_grid[line[1]], flat_grid[line[2]]
        if s1 == s2 == s3 or (s1 == 'wild' and s2 == s3) or (s2 == 'wild' and s1 == s3) or (s3 == 'wild' and s1 == s2):
            sym = s1 if s1 != 'wild' else (s2 if s2 != 'wild' else s3)
            pay = SLOT_SYMBOLS[sym]['pay3']
            total_win += req.bet * pay
            winning_lines.append({"line_index": i, "symbol": sym, "amount": req.bet * pay})
    if total_win > 0:
        user.balance += total_win
        db.commit()
    return {"balance": user.balance, "grid": grid, "win": total_win, "winning_lines": winning_lines}

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
    if not target: raise HTTPException(status_code=404, detail="Юзер не найден")
    target.balance += req.amount
    db.commit()
    return {"status": "ok", "new_balance": target.balance}

async def main():
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    config = uvicorn.Config(app, host="0.0.0.0", port=port)
    server = uvicorn.Server(config)
    bot_task = asyncio.create_task(dp.start_polling(bot))
    await server.serve()
    bot_task.cancel()
    await bot.session.close()

if __name__ == "__main__":
    asyncio.run(main())
