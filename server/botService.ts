import { spawn } from "node:child_process";
import path from "node:path";

export type PhoneValidation = {
  valid: boolean;
  e164?: string;
  nationalFormatted?: string;
  countryIso?: string;
  dialCode?: string;
  error?: string;
};

export type ConnectorResult = {
  status: "pairing_code_generated" | "connector_not_configured" | "connector_error" | "disconnected";
  pairingCode?: string;
  error?: string;
};

export type AiResult = {
  status: "ok" | "llm_not_configured" | "llm_error";
  response?: string;
  error?: string;
};

export type ConnectorStatusResult = {
  configured: boolean;
  connectionStatus?: "ready_to_pair" | "pairing" | "connected" | "disconnected" | "error";
  error?: string;
};

type PythonPayload =
  | { action: "validate"; countryIso: string; countryDialCode: string; nationalNumber: string }
  | { action: "request_pairing"; phoneE164: string }
  | { action: "disconnect"; phoneE164: string }
  | { action: "status"; phoneE164: string }
  | { action: "configuration" }
  | { action: "ai_reply"; prompt: string };

function runPython(payload: PythonPayload): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "python_service", "nep_bot_service.py");
    const child = spawn("python3", [script], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), 8000);
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(stderr || "Python service did not complete"));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Python service returned invalid data"));
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function validatePhoneNumber(input: { countryIso: string; countryDialCode: string; nationalNumber: string }) {
  return runPython({ action: "validate", ...input }) as Promise<PhoneValidation>;
}

export async function requestPairingCode(phoneE164: string) {
  return runPython({ action: "request_pairing", phoneE164 }) as Promise<ConnectorResult>;
}

export async function disconnectConnector(phoneE164: string) {
  return runPython({ action: "disconnect", phoneE164 }) as Promise<ConnectorResult>;
}

export async function generateAiReply(prompt: string) {
  return runPython({ action: "ai_reply", prompt }) as Promise<AiResult>;
}

export async function getConnectorStatus(phoneE164: string) {
  return runPython({ action: "status", phoneE164 }) as Promise<ConnectorStatusResult>;
}

export async function getConnectorConfiguration() {
  return runPython({ action: "configuration" }) as Promise<{ configured: boolean }>;
}
