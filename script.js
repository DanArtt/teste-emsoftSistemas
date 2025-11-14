// ---- Tema Dark ----
const toggleBtn = document.getElementById("themeToggle");

// Carrega tema salvo
if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark");
  toggleBtn.textContent = "☀️ Light";
}

// Alternância clique
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("tema", "dark");
    toggleBtn.textContent = "☀️ Light";
  } else {
    localStorage.setItem("tema", "light");
    toggleBtn.textContent = "🌙 Dark";
  }
});

// script.js melhorado — UX, animações e validações

const cepForm = document.getElementById("cepForm");
const cepInput = document.getElementById("cep");
const buscarBtn = document.getElementById("buscarBtn");
const cepFeedback = document.getElementById("cepFeedback");
const loading = document.getElementById("loading");
const addressCard = document.getElementById("addressCard");
const addressForm = document.getElementById("addressForm");
const enviarBtn = document.getElementById("enviarBtn");
const voltarBtn = document.getElementById("voltarBtn");
const saveFeedback = document.getElementById("saveFeedback");

//Utilidades
function showLoading(show) {
  loading.classList.toggle("d-none", !show);
}

function showCepFeedback(msg) {
  cepFeedback.textContent = msg;
  cepFeedback.classList.toggle("d-none", !msg);
}

function showSaveFeedback(type, msg) {
  saveFeedback.className = "alert";
  saveFeedback.classList.add(
    type === "success" ? "alert-success" : "alert-danger"
  );
  saveFeedback.textContent = msg;
  saveFeedback.classList.remove("d-none");
}

//Validacao do CEP somente 8 digitos numericos
function validarCep(cep) {
  return /^[0-9]{8}$/.test(cep);
}

cepInput.addEventListener("input", () => {
  const value = cepInput.value.replace(/\D/g, "");
  cepInput.value = value;

  if (value.length === 8) {
    cepInput.classList.remove("is-invalid");
    cepInput.classList.add("is-valid");
  } else {
    cepInput.classList.remove("is-valid");
  }
});

// Consulta API
cepForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  saveFeedback.classList.add("d-none");

  addressCard.classList.remove("show");
  addressCard.classList.add("d-none");

  const cep = cepInput.value.replace(/\D/g, "");

  if (!validarCep(cep)) {
    showCepFeedback(
      "CEP inválido. Informe 8 dígitos numéricos (ex: 01310100)."
    );

    cepInput.classList.add("is-invalid", "shake");
    setTimeout(() => cepInput.classList.remove("shake"), 300);

    return;
  }

  cepInput.classList.remove("is-invalid");
  showCepFeedback("");
  showLoading(true);

  try {
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Erro na requisição ao ViaCEP.");

    const data = await resp.json();

    if (data.erro) {
      showCepFeedback("CEP não encontrado.");
      showLoading(false);
      cepInput.classList.add("is-invalid", "shake");
      setTimeout(() => cepInput.classList.remove("shake"), 300);
      return;
    }

    await new Promise((res) => setTimeout(res, 1000));

    document.getElementById("endereco").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("estado").value = data.uf || "";
    document.getElementById("pais").value = "Brasil";

    // Exibir card com animação
    addressCard.classList.remove("d-none");
    setTimeout(() => addressCard.classList.add("show"), 10);

    enviarBtn.focus();
  } catch (err) {
    console.error(err);
    showCepFeedback("Erro ao consultar ViaCEP. Tente novamente mais tarde.");
  } finally {
    showLoading(false);
  }
});

voltarBtn.addEventListener("click", () => {
  addressCard.classList.remove("show");
  setTimeout(() => addressCard.classList.add("d-none"), 250);
  saveFeedback.classList.add("d-none");
  cepInput.focus();
});

//Envio dos dados para o back
addressForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveFeedback.classList.add("d-none");

  const payload = {
    cep: cepInput.value.replace(/\D/g, ""),
    endereco: document.getElementById("endereco").value.trim(),
    bairro: document.getElementById("bairro").value.trim(),
    cidade: document.getElementById("cidade").value.trim(),
    estado: document.getElementById("estado").value.trim(),
    pais: document.getElementById("pais").value.trim(),
  };

  if (!validarCep(payload.cep)) {
    showSaveFeedback("danger", "CEP inválido antes de enviar.");
    return;
  }
  if (!payload.endereco || !payload.cidade || !payload.estado) {
    showSaveFeedback("danger", "Preencha os campos obrigatórios.");
    return;
  }

  enviarBtn.disabled = true;
  enviarBtn.textContent = "Enviando...";

  try {
    const resp = await fetch("backend/api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || "Erro no servidor");
    }

    const result = await resp.json();

    if (result.status === "ok") {
      showSaveFeedback("success", result.message || "Salvo com sucesso.");
    } else {
      showSaveFeedback("danger", result.message || "Erro ao salvar.");
    }
  } catch (err) {
    console.error(err);
    showSaveFeedback(
      "danger",
      "Erro na comunicação com o servidor. " + (err.message || "")
    );
  } finally {
    enviarBtn.disabled = false;
    enviarBtn.textContent = "Enviar";
  }
});
