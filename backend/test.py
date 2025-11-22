import requests
import time

BASE = "http://127.0.0.1:8000"

TICKET_ID = "ticket_persist1"
REPO_URL = "https://github.com/vishnuvvaradhan/tickerproject.git"


def stream_sse(payload):
    """Stream SSE events manually using requests."""
    print("\n--- STREAM OUTPUT START ---\n")

    with requests.post(f"{BASE}/command", json=payload, stream=True) as resp:
        resp.raise_for_status()

        for line in resp.iter_lines(decode_unicode=True):
            if not line:
                continue

            if line.startswith("data:"):
                data = line.replace("data:", "").strip()
                print("SSE:", data)

                if data == "__END__":
                    break

    print("\n--- STREAM OUTPUT END ---\n")


def create_ticket():
    print("=== /create_ticket ===")
    r = requests.post(
        f"{BASE}/create_ticket",
        params={
            "ticket_id": TICKET_ID,
            "repo_url": REPO_URL
        }
    )
    print("Status:", r.status_code)
    print("Response:", r.json())
    print()


def test_chat_persistence():
    print("=== FIRST CHAT MESSAGE ===")
    payload1 = {
        "ticket_id": TICKET_ID,
        "action": "chat",
        "message": "Hello Gemini, I am testing session persistence!"
    }
    stream_sse(payload1)

    time.sleep(1)

    print("=== SECOND CHAT: ask what I said previously ===")
    payload2 = {
        "ticket_id": TICKET_ID,
        "action": "chat",
        "message": "What did I say in the previous message?"
    }
    stream_sse(payload2)


if __name__ == "__main__":
    print(">>> RUNNING PERSISTENCE TEST <<<\n")

    create_ticket()
    test_chat_persistence()
