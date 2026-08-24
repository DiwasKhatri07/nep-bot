#!/usr/bin/env python3
"""Stateless Python service for NEP BOT validation and connector orchestration.

Session credentials and connector tokens stay in environment variables or the external
connector. This service never persists pairing codes or WhatsApp session material.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

import phonenumbers
from phonenumbers import PhoneNumberFormat


def send(result):
    print(json.dumps(result, separators=(",", ":")))


def validate(payload):
    country_iso = str(payload.get("countryIso", "")).upper().strip()
    dial = re.sub(r"\D", "", str(payload.get("countryDialCode", "")))
    national = re.sub(r"\D", "", str(payload.get("nationalNumber", "")))
    if not re.fullmatch(r"[A-Z]{2}", country_iso) or not 1 <= len(dial) <= 4 or not 4 <= len(national) <= 15:
        return {"valid": False, "error": "Enter a valid country and national phone number."}
    try:
        parsed = phonenumbers.parse(f"+{dial}{national}", None)
    except phonenumbers.NumberParseException:
        return {"valid": False, "error": "The phone number could not be parsed."}
    if not phonenumbers.is_possible_number(parsed) or not phonenumbers.is_valid_number(parsed):
        return {"valid": False, "error": "Enter a valid active-format phone number."}
    detected_region = phonenumbers.region_code_for_number(parsed)
    if detected_region and detected_region != country_iso:
        return {"valid": False, "error": "The phone number does not match the selected country."}
    return {
        "valid": True,
        "e164": phonenumbers.format_number(parsed, PhoneNumberFormat.E164),
        "nationalFormatted": phonenumbers.format_number(parsed, PhoneNumberFormat.NATIONAL),
        "countryIso": country_iso,
        "dialCode": dial,
    }


def call_connector(action, phone_e164):
    base_url = os.environ.get("NEP_CONNECTOR_URL", "").rstrip("/")
    token = os.environ.get("NEP_CONNECTOR_TOKEN", "")
    if not base_url:
        return {"status": "connector_not_configured", "error": "The WhatsApp connector has not been configured."}
    request_body = json.dumps({"action": action, "phoneE164": phone_e164}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/connector/{action}",
        data=request_body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"} if token else {"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=6) as response:
            connector_response = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError):
        return {"status": "connector_error", "error": "The WhatsApp connector could not complete the request."}
    if action == "request_pairing":
        pairing_code = str(connector_response.get("pairingCode", "")).strip()
        if not re.fullmatch(r"[A-Za-z0-9-]{4,24}", pairing_code):
            return {"status": "connector_error", "error": "The connector did not return a usable pairing code."}
        return {"status": "pairing_code_generated", "pairingCode": pairing_code}
    return {"status": "disconnected"}


def connector_status(phone_e164):
    base_url = os.environ.get("NEP_CONNECTOR_URL", "").rstrip("/")
    token = os.environ.get("NEP_CONNECTOR_TOKEN", "")
    if not base_url:
        return {"configured": False, "error": "The WhatsApp connector has not been configured."}
    request_body = json.dumps({"action": "status", "phoneE164": phone_e164}).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/connector/status",
        data=request_body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"} if token else {"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=6) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError):
        return {"configured": True, "connectionStatus": "error", "error": "The connector status check failed."}
    status = str(payload.get("connectionStatus", payload.get("status", ""))).strip().lower()
    allowed = {"ready_to_pair", "pairing", "connected", "disconnected", "error"}
    if status not in allowed:
        return {"configured": True, "connectionStatus": "error", "error": "The connector returned an invalid connection state."}
    return {"configured": True, "connectionStatus": status}


def connector_configuration():
    return {"configured": bool(os.environ.get("NEP_CONNECTOR_URL", "").strip())}


def generate_ai_reply(prompt):
    api_key = os.environ.get("NEP_LLM_API_KEY", "")
    base_url = os.environ.get("NEP_LLM_BASE_URL", "").rstrip("/")
    model = os.environ.get("NEP_LLM_MODEL", "")
    if not api_key or not base_url or not model:
        return {"status": "llm_not_configured", "error": "Set the LLM key, base URL, and model before enabling AI."}
    clean_prompt = str(prompt).strip()
    if not clean_prompt or len(clean_prompt) > 500:
        return {"status": "llm_error", "error": "Enter a short AI test prompt."}
    body = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are NEP BOT. Give concise, helpful, safe chat responses. Never claim to control WhatsApp accounts."},
            {"role": "user", "content": clean_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 220,
    }).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = str(payload["choices"][0]["message"]["content"]).strip()
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError, KeyError, IndexError):
        return {"status": "llm_error", "error": "The configured AI provider did not return a usable response."}
    return {"status": "ok", "response": content[:1200]}


def main():
    try:
        raw = sys.stdin.read(4096)
        payload = json.loads(raw)
    except (ValueError, json.JSONDecodeError):
        send({"valid": False, "error": "Invalid service request."})
        return
    action = payload.get("action")
    if action == "validate":
        send(validate(payload))
    elif action in ("request_pairing", "disconnect"):
        send(call_connector(action, str(payload.get("phoneE164", ""))))
    elif action == "status":
        send(connector_status(str(payload.get("phoneE164", ""))))
    elif action == "configuration":
        send(connector_configuration())
    elif action == "ai_reply":
        send(generate_ai_reply(payload.get("prompt", "")))
    else:
        send({"status": "connector_error", "error": "Unsupported service action."})


if __name__ == "__main__":
    main()
