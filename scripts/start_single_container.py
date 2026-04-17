import os
import signal
import subprocess
import sys
import time


ROOT_DIR = "/app"
WEB_DIR = "/app/web"


def terminate_process(process: subprocess.Popen | None, label: str) -> None:
    if process is None or process.poll() is not None:
        return

    print(f"Stopping {label}...")
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main() -> int:
    shared_env = os.environ.copy()
    shared_env.setdefault("API_BASE_URL", "http://127.0.0.1:8000")
    shared_env.setdefault("NEXT_SERVER_URL", "http://127.0.0.1:3000")
    shared_env.setdefault("NEXT_TELEMETRY_DISABLED", "1")

    next_env = shared_env.copy()
    next_env["NODE_ENV"] = "production"
    next_env["HOSTNAME"] = "0.0.0.0"
    next_env["PORT"] = "3000"

    next_process = subprocess.Popen(
        ["node", "server.js"],
        cwd=WEB_DIR,
        env=next_env,
    )

    api_process: subprocess.Popen | None = None

    def shutdown(signum, _frame):
        print(f"Received signal {signum}, shutting down...")
        terminate_process(api_process, "FastAPI")
        terminate_process(next_process, "Next.js")
        raise SystemExit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        migrate_result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=ROOT_DIR,
            env=shared_env,
            check=False,
        )
        if migrate_result.returncode != 0:
            terminate_process(next_process, "Next.js")
            return migrate_result.returncode

        api_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
            ],
            cwd=ROOT_DIR,
            env=shared_env,
        )

        while True:
            next_returncode = next_process.poll()
            api_returncode = api_process.poll()

            if next_returncode is not None:
                terminate_process(api_process, "FastAPI")
                return next_returncode

            if api_returncode is not None:
                terminate_process(next_process, "Next.js")
                return api_returncode

            time.sleep(1)
    finally:
        terminate_process(api_process, "FastAPI")
        terminate_process(next_process, "Next.js")


if __name__ == "__main__":
    raise SystemExit(main())
