from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import asyncio
from typing import List, Dict
import json
import random
import logging

connected_clients: List[WebSocket] = []
icon_counts: Dict[str, int] = {}
timer_value = 10
game_state = "voting"
available_icons = [
    "nes-mario",
    "nes-ash",
    "nes-pokeball",
    "nes-bulbasaur",
    "nes-charmander",
    "nes-squirtle",
    "nes-kirby",
]


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_index():
    return FileResponse("index.html")


async def broadcast(message: dict):
    for client in connected_clients:
        await client.send_json(message)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    logger.info(f"New client connected. Total connections: {len(connected_clients)}")
    try:
        await broadcast({"type": "game_state", "state": game_state})
        await websocket.send_json({"type": "icons", "icons": available_icons})
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "icon_selected" and game_state == "voting":
                icon = message["icon"]
                if icon in available_icons:
                    icon_counts[icon] = icon_counts.get(icon, 0) + 1
                    await broadcast({"type": "icon_counts", "counts": icon_counts})
                    logger.info(
                        f"Vote received for {icon}. Current counts: {icon_counts}"
                    )

    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        logger.info(f"Client disconnected. Total connections: {len(connected_clients)}")


async def game_loop():
    global timer_value, game_state, icon_counts
    while True:
        # Voting phase
        game_state = "voting"
        timer_value = 10
        shuffled_icons = random.sample(available_icons, len(available_icons))
        icon_counts = {icon: 0 for icon in shuffled_icons}
        await broadcast({"type": "game_state", "state": game_state})
        await broadcast({"type": "icons", "icons": shuffled_icons})
        await broadcast({"type": "icon_counts", "counts": icon_counts})

        while timer_value > 0:
            await broadcast({"type": "timer", "value": timer_value})
            await asyncio.sleep(1)
            timer_value -= 1

        # Results phase
        game_state = "results"
        await broadcast({"type": "game_state", "state": game_state})

        most_voted_icon = max(icon_counts, key=icon_counts.get)
        most_voted_count = icon_counts[most_voted_icon]
        logger.info(
            f"Voting results: Top vote - {most_voted_icon} with {most_voted_count} votes"
        )

        await broadcast(
            {"type": "vote_result", "icon": most_voted_icon, "count": most_voted_count}
        )

        timer_value = 20  # Changed to 20 seconds
        while timer_value > 0:
            await broadcast({"type": "timer", "value": timer_value})
            await asyncio.sleep(1)
            timer_value -= 1


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(game_loop())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
