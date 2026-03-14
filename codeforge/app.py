from flask import Flask, render_template, request, Response, stream_with_context, jsonify
import json
import urllib.request
import urllib.error

app = Flask(__name__)

API_KEY = "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"
BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "microsoft/phi-4-mini-instruct"

STYLE_PROMPTS = {
    "clean": "Write clean, readable code with brief inline comments on complex sections.",
    "terse": "Write terse, idiomatic code. Minimize comments. Prioritize brevity.",
    "verbose": "Write verbose code with full docstrings and documentation for all functions.",
    "beginner": "Write beginner-friendly code with detailed step-by-step comments.",
}

LANG_EXTENSIONS = {
    "python": "py", "javascript": "js", "typescript": "ts",
    "go": "go", "rust": "rs", "java": "java", "cpp": "cpp",
    "c": "c", "bash": "sh", "sql": "sql", "php": "php",
    "ruby": "rb", "swift": "swift", "kotlin": "kt", "auto": "txt"
}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    prompt = data.get("prompt", "").strip()
    lang = data.get("lang", "python")
    style = data.get("style", "clean")
    temperature = float(data.get("temperature", 0.1))
    max_tokens = int(data.get("max_tokens", 1024))

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    lang_str = (
        f"Write the code in {lang}."
        if lang != "auto"
        else "Use the most appropriate language for the task."
    )
    style_str = STYLE_PROMPTS.get(style, STYLE_PROMPTS["clean"])

    system_msg = (
        f"You are CodeForge, an expert software engineer. "
        f"{lang_str} {style_str} "
        f"Output ONLY the raw code — no markdown fences, no preamble, "
        f"no explanation outside the code. Start with the first line of code."
    )

    payload = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "top_p": 0.7,
        "max_tokens": max_tokens,
        "stream": True
    }).encode("utf-8")

    def event_stream():
        req = urllib.request.Request(
            BASE_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
                "Accept": "text/event-stream",
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8").strip()
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        yield "data: [DONE]\n\n"
                        break
                    try:
                        parsed = json.loads(chunk)
                        token = parsed["choices"][0]["delta"].get("content", "")
                        if token:
                            yield f"data: {json.dumps({'token': token})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                err = json.loads(body)
                msg = err.get("detail") or err.get("message") or f"HTTP {e.code}"
            except Exception:
                msg = f"HTTP {e.code}: {body[:200]}"
            yield f"data: {json.dumps({'error': msg})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    print("\n🔥 CodeForge is running at http://127.0.0.1:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
