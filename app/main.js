(() => {
  "use strict";

  const LANGUAGES = {
    de: { name: "Deutsch", flag: "🇩🇪", dir: "ltr", speechLang: "de-DE" },
    en: { name: "English", flag: "🇬🇧", dir: "ltr", speechLang: "en-GB" },
    fr: { name: "Français", flag: "🇫🇷", dir: "ltr", speechLang: "fr-FR" },
    ar: { name: "العربية", flag: "🇲🇦", dir: "rtl", speechLang: "ar-SA" },
  };

  const state = {
    language: "fr",
    mode: "learn",
    category: "",
    words: [],
    currentIndex: 0,
    results: [],
    data: null,
    catalog: null,
    answered: false,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const dataUrl = (file) => new URL(`data/${file}`, document.baseURI).href;
  const screens = {
    setup: $("#setupScreen"),
    exercise: $("#exerciseScreen"),
    result: $("#resultScreen"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((screen) =>
      screen.classList.remove("active"),
    );
    screens[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderLanguages() {
    renderLanguageSwitcher();
  }

  function renderLanguageSwitcher() {
    const switcher = $("#languageSwitcher");
    switcher.innerHTML = "";
    Object.entries(LANGUAGES).forEach(([key, lang]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `language-icon${key === state.language ? " selected" : ""}`;
      button.title = `${lang.name} wählen`;
      button.setAttribute("aria-label", `${lang.name} wählen`);
      button.innerHTML = `<span aria-hidden="true">${lang.flag}</span>`;
      button.addEventListener("click", () => selectLanguage(key));
      switcher.appendChild(button);
    });
  }

  async function selectLanguage(key) {
    const previousCategory = state.category;
    const wasExercise = screens.exercise.classList.contains("active");
    const wasResult = screens.result.classList.contains("active");
    state.language = key;
    renderLanguageSwitcher();
    document.documentElement.lang = key;
    document.documentElement.dir = LANGUAGES[key].dir;
    await loadLanguageData();
    if (previousCategory && state.data?.categories?.[previousCategory]) {
      state.category = previousCategory;
      $("#categorySelect").value = previousCategory;
    }
    if (wasExercise) start();
    if (wasResult) showScreen("setup");
  }

  async function loadLanguageData() {
    const select = $("#categorySelect");
    select.innerHTML = "<option>Wird geladen …</option>";
    select.disabled = true;
    try {
      if (window.location.protocol === "file:") {
        throw new Error(
          "Die App wurde direkt als Datei geöffnet. Für fetch() wird ein lokaler Webserver benötigt.",
        );
      }
      const categoriesResponse = await fetch(dataUrl("categories.json"));
      if (!categoriesResponse.ok) {
        throw new Error(`HTTP ${categoriesResponse.status}`);
      }
      const categoryConfig = await categoriesResponse.json();
      if (
        !Array.isArray(categoryConfig.files) ||
        !categoryConfig.files.length
      ) {
        throw new Error("Keine Kategorie-Dateien konfiguriert");
      }
      const responses = await Promise.all(
        categoryConfig.files.map((file) => fetch(dataUrl(file))),
      );
      const invalidResponse = responses.find((response) => !response.ok);
      if (invalidResponse) throw new Error(`HTTP ${invalidResponse.status}`);
      const loadedFiles = await Promise.all(
        responses.map((response) => response.json()),
      );
      const categoryFiles = loadedFiles.flatMap((file) =>
        Array.isArray(file) ? file : [file],
      );
      state.data = {
        categories: Object.fromEntries(
          categoryFiles.map((categoryFile) => [
            categoryFile.id,
            createLanguageCategory(categoryFile, state.language),
          ]),
        ),
      };
      state.catalog = Object.fromEntries(
        categoryFiles.map((categoryFile) => [categoryFile.id, categoryFile]),
      );
      populateCategories(select);
    } catch (error) {
      state.data = null;
      state.catalog = null;
      select.innerHTML = "<option>Fehler beim Laden</option>";
      select.disabled = true;
      state.category = "";
      $("#setupStatus").textContent = error.message.includes(
        "lokalen Webserver",
      )
        ? "Bitte starte die Seite über einen lokalen Webserver, z. B. mit: python -m http.server 8000, und öffne danach http://localhost:8000."
        : "Die Wortdaten konnten nicht geladen werden. Bitte prüfe, ob der lokale Webserver läuft.";
      console.error("Wortdaten konnten nicht geladen werden:", error);
    }
  }

  function createLanguageCategory(categoryFile, language) {
    return {
      name: categoryFile.name[language],
      words: categoryFile.items.map((item) => ({
        word: item[language].word,
        answer: item[language].opposite,
        answers: [item[language].opposite],
      })),
    };
  }

  function populateCategories(select) {
    const entries = Object.entries(state.data?.categories || {});
    if (!entries.length) throw new Error("Keine Kategorien gefunden");
    select.innerHTML = "";
    entries.forEach(([id, category]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = category.name;
      select.appendChild(option);
    });
    state.category = select.value;
    select.disabled = false;
    $("#setupStatus").textContent = "";
  }

  function getCurrentCategory() {
    return state.data?.categories?.[state.category] || null;
  }

  function selectMode(mode) {
    state.mode = mode;
    $$(".mode-card").forEach((button) =>
      button.classList.toggle("selected", button.dataset.mode === mode),
    );
  }

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'")
      .replace(/[–—-]/g, "-")
      .replace(/\s+/g, " ");
  }

  function isCorrect(input, answers) {
    return answers.some((answer) => normalize(answer) === normalize(input));
  }

  function start() {
    const category = getCurrentCategory();
    if (!category?.words?.length) {
      $("#setupStatus").textContent =
        "Für diese Kategorie sind keine Wörter vorhanden.";
      return;
    }
    state.words = [...category.words];
    state.currentIndex = 0;
    state.results = [];
    state.answered = false;
    $("#languageLabel").textContent = LANGUAGES[state.language].name;
    $("#categoryLabel").textContent = category.name;
    $("#modeLabel").textContent =
      state.mode === "learn"
        ? "Lernen"
        : state.mode === "training"
          ? "Trainieren"
          : "Test";
    $("#exerciseTitle").textContent =
      state.mode === "learn"
        ? "Lerne die Gegenteile"
        : state.mode === "training"
          ? "Gib das Gegenteil ein"
          : "Teste dein Wissen";
    showScreen("exercise");
    renderCard();
  }

  function updateProgress() {
    const total = state.words.length;
    const current = state.currentIndex + 1;
    $("#progressLabel").textContent = `${Math.min(current, total)} / ${total}`;
    $("#progressBar").style.width =
      `${Math.min((current / total) * 100, 100)}%`;
  }

  function speakWord(word) {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setFeedback(
        "info",
        "Vorlesen wird von diesem Browser nicht unterstützt.",
      );
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = LANGUAGES[state.language].speechLang;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function createSpeechButton(word) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "speech-button";
    button.textContent = "▶";
    button.title = `${LANGUAGES[state.language].name}: ${word} vorlesen`;
    button.setAttribute(
      "aria-label",
      `${LANGUAGES[state.language].name}: ${word} vorlesen`,
    );
    button.addEventListener("click", () => speakWord(word));
    return button;
  }

  function createTranslationButton(wordIndex, word, field = "word") {
    const wrapper = document.createElement("span");
    wrapper.className = "translation-wrap";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "translation-button";
    button.textContent = "文";
    button.title = "Übersetzungen anzeigen";
    button.setAttribute("aria-label", `Übersetzungen für ${word} anzeigen`);

    const popover = document.createElement("span");
    popover.className = "translation-popover";
    popover.setAttribute("role", "tooltip");
    const category = state.catalog?.[state.category];
    const groupedItem = category?.items?.find((item) =>
      Object.values(item).some(
        (languageItem) =>
          normalize(languageItem[field === "word" ? "word" : "opposite"]) ===
          normalize(word),
      ),
    );
    const translations = Object.entries(LANGUAGES)
      .filter(([language]) => language !== state.language)
      .map(([language, info]) => {
        const translated = groupedItem
          ? groupedItem[language][field === "word" ? "word" : "opposite"]
          : "";
        return translated
          ? `<span><strong>${info.flag} ${info.name}</strong>: ${translated}</span>`
          : "";
      })
      .filter(Boolean);
    popover.innerHTML = translations.length
      ? translations.join("")
      : "Keine Übersetzung vorhanden";

    wrapper.append(button, popover);
    return wrapper;
  }

  function renderWordWithSpeech(container, word, wordIndex, showTranslations) {
    container.innerHTML = "";
    const text = document.createElement("span");
    text.textContent = word;
    container.append(text, createSpeechButton(word));
    if (showTranslations) {
      container.append(createTranslationButton(wordIndex, word));
    }
  }

  function renderCard() {
    const item = state.words[state.currentIndex];
    if (!item) return finishTest();
    state.answered = false;
    updateProgress();
    renderWordWithSpeech(
      $("#questionWord"),
      item.word,
      state.currentIndex,
      state.mode === "learn",
    );
    $("#feedback").className = "feedback";
    $("#feedback").textContent = "";
    renderAnswerArea(item);
    $("#backButton").disabled =
      state.mode !== "learn" || state.currentIndex === 0;
    $("#nextButton").disabled = false;
    $("#nextButton").textContent =
      state.currentIndex === state.words.length - 1 ? "Fertig" : "Weiter";
  }

  function renderAnswerArea(item) {
    const area = $("#answerArea");
    area.innerHTML = "";
    if (state.mode === "learn") {
      const answer = document.createElement("div");
      answer.className = "answer-display";
      const text = document.createElement("span");
      text.textContent = item.answer;
      answer.append(
        text,
        createSpeechButton(item.answer),
        createTranslationButton(state.currentIndex, item.answer, "answer"),
      );
      area.appendChild(answer);
      $("#nextButton").disabled = false;
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "answer-input-wrap";
    const input = document.createElement("input");
    input.className = "answer-input";
    input.id = "answerInput";
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.placeholder = "Gegenteil eingeben …";
    input.setAttribute("aria-label", "Gegenteil eingeben");
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        validateAnswer();
      }
    });
    wrap.appendChild(input);
    area.appendChild(wrap);
    if (state.mode === "test") {
      const note = document.createElement("div");
      note.className = "test-note";
      note.textContent = "Drücke Enter, um deine Antwort zu prüfen.";
      area.appendChild(note);
    }
    setTimeout(() => input.focus(), 80);
  }

  function setFeedback(type, message) {
    const feedback = $("#feedback");
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
  }

  function validateAnswer() {
    if (state.answered) return;
    const item = state.words[state.currentIndex];
    const input = $("#answerInput");
    if (!input) return;
    const value = input.value.trim();
    if (!value) {
      setFeedback("info", "Bitte gib zuerst ein Gegenteil ein.");
      input.focus();
      return;
    }
    const correct = isCorrect(value, item.answers || [item.answer]);
    state.answered = true;
    state.results[state.currentIndex] = correct;
    setFeedback(
      correct ? "success" : "error",
      correct
        ? `✓ Richtig! Das Gegenteil von „${item.word}“ ist „${item.answer}“.`
        : `✗ Nicht ganz. Richtig ist: „${item.answer}“.`,
    );
    input.disabled = true;
    $("#nextButton").disabled = false;
    $("#nextButton").focus();
  }

  function next() {
    if (state.mode !== "learn" && !state.answered) {
      validateAnswer();
      return;
    }
    if (state.currentIndex >= state.words.length - 1) {
      finishTest();
      return;
    }
    state.currentIndex += 1;
    renderCard();
  }

  function previous() {
    if (state.mode !== "learn" || state.currentIndex === 0) return;
    state.currentIndex -= 1;
    renderCard();
  }

  function finishTest() {
    if (state.mode === "learn") {
      showScreen("setup");
      $("#setupStatus").textContent =
        "Lernrunde abgeschlossen. Du kannst eine Kategorie oder einen anderen Modus wählen.";
      return;
    }
    if (state.mode === "training") {
      state.currentIndex = 0;
      state.results = [];
      state.answered = false;
      renderCard();
      setFeedback(
        "info",
        "Runde abgeschlossen – neue Trainingsrunde gestartet.",
      );
      return;
    }
    const total = state.words.length;
    const correct = state.results.filter(Boolean).length;
    $("#scorePercent").textContent =
      `${total ? Math.round((correct / total) * 100) : 0}%`;
    $("#scoreSummary").textContent = `${correct} von ${total} richtig`;
    $("#resultLanguage").textContent = LANGUAGES[state.language].name;
    $("#resultCategory").textContent =
      getCurrentCategory()?.name || state.category;
    $("#resultCorrect").textContent = correct;
    $("#resultWrong").textContent = total - correct;
    showScreen("result");
  }

  function returnHome() {
    showScreen("setup");
    $("#setupStatus").textContent = "";
  }

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    $("#themeIcon").textContent = isDark ? "☀" : "☾";
    $("#themeButton").setAttribute("aria-pressed", String(isDark));
    $("#themeButton").setAttribute(
      "aria-label",
      isDark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren",
    );
    localStorage.setItem("wordOppositesTheme", isDark ? "dark" : "light");
  }

  function setupEvents() {
    $("#categorySelect").addEventListener("change", (event) => {
      state.category = event.target.value;
    });
    $$(".mode-card").forEach((button) =>
      button.addEventListener("click", () => selectMode(button.dataset.mode)),
    );
    $("#startButton").addEventListener("click", start);
    $("#backButton").addEventListener("click", previous);
    $("#nextButton").addEventListener("click", next);
    $("#finishButton").addEventListener("click", returnHome);
    $("#homeButton").addEventListener("click", returnHome);
    $("#themeButton").addEventListener("click", () =>
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "light" : "dark",
      ),
    );
    $("#restartButton").addEventListener("click", start);
    $("#resultHomeButton").addEventListener("click", returnHome);
  }

  renderLanguages();
  setupEvents();
  setTheme(localStorage.getItem("wordOppositesTheme") || "dark");
  selectLanguage(state.language);
})();
