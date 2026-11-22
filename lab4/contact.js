"use strict";

class ContactRequest {
  constructor(name, email, topic, message, consent) {
    this.name = name;
    this.email = email;
    this.topic = topic;
    this.message = message;
    this.consent = consent;
    this.createdAt = new Date().toISOString();
  }

  printToConsole() {
    console.group("%c📨 Новое обращение — ContactRequest", "font-weight: bold; font-size: 14px;");
    console.table({
      "Имя": this.name,
      "Email": this.email,
      "Тема": this.topic,
      "Сообщение": this.message,
      "Согласие": this.consent ? "Да" : "Нет",
      "Создано (UTC)": this.createdAt
    });
    console.log("Экземпляр класса:", this);
    console.groupEnd();
  }

  toJSON() {
    return {
      name: this.name,
      email: this.email,
      topic: this.topic,
      message: this.message,
      consent: this.consent,
      createdAt: this.createdAt
    };
  }
}

const form = document.querySelector("#contact-form");
const feedback = document.querySelector("#contact-feedback");
const submitButton = document.querySelector("#contact-submit");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const values = new FormData(form);
  const request = new ContactRequest(
    String(values.get("name") ?? "").trim(),
    String(values.get("email") ?? "").trim(),
    String(values.get("topic") ?? ""),
    String(values.get("message") ?? "").trim(),
    values.get("consent") === "yes"
  );

  request.printToConsole();
  submitButton.disabled = true;
  feedback.dataset.state = "";
  feedback.textContent = "Отправка сообщения...";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.toJSON())
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Ошибка отправки");

    feedback.dataset.state = "success";
    feedback.textContent = "Сообщение принято локальным сервером.";
    form.reset();
  } catch (error) {
    feedback.dataset.state = "error";
    feedback.textContent = "Не удалось отправить сообщение. Убедись, что локальный сервер запущен.";
  } finally {
    submitButton.disabled = false;
  }
});
