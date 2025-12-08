from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)  # <-- Add this line

ALLOWED_COMMANDS = {
    "list_files": ["ls"],
    "current_dir": ["pwd"]
}

@app.route("/run", methods=["POST"])
def run_command():
    data = request.json
    command = data.get("command")
    print(data)
    print(command)

    try:
        result = subprocess.check_output(command, stderr=subprocess.STDOUT)
        return jsonify({"output": result.decode()})
    except subprocess.CalledProcessError as e:
        return jsonify({"error": e.output.decode()}), 500

if __name__ == "__main__":
    app.run(debug=True)
