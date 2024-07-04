const { ipcRenderer, clipboard } = require("electron");
function validaCPF(cpf) {
  let Soma = 0;
  let Resto;

  const strCPF = String(cpf);

  if (strCPF.length !== 11) return false;

  if (
    [
      "00000000000",
      "11111111111",
      "22222222222",
      "33333333333",
      "44444444444",
      "55555555555",
      "66666666666",
      "77777777777",
      "88888888888",
      "99999999999",
    ].indexOf(strCPF) !== -1
  )
    return false;

  for (let i = 1; i <= 9; i++)
    Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);

  Resto = (Soma * 10) % 11;

  if (Resto == 10 || Resto == 11) Resto = 0;

  if (Resto != parseInt(strCPF.substring(9, 10))) return false;

  Soma = 0;

  for (let i = 1; i <= 10; i++)
    Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);

  Resto = (Soma * 10) % 11;

  if (Resto == 10 || Resto == 11) Resto = 0;

  if (Resto != parseInt(strCPF.substring(10, 11))) return false;

  return true;
}

function validaCNPJ(cnpj) {
  const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const c = String(cnpj);

  if (c.length !== 14) return false;

  if (/0{14}/.test(c)) return false;

  let i = 0;
  let n = 0;
  for (i; i < 12; n += parseInt(c[i]) * b[++i]);
  if (parseInt(c[12]) !== ((n %= 11) < 2 ? 0 : 11 - n)) return false;

  i = 0;
  n = 0;
  for (i; i <= 12; n += parseInt(c[i]) * b[i++]);
  if (parseInt(c[13]) !== ((n %= 11) < 2 ? 0 : 11 - n)) return false;

  return true;
}
function getTableSelector(element) {
  // Percorre os elementos pai até encontrar a tabela mais próxima
  while (element && element.tagName !== "TABLE") {
    element = element.parentNode;
  }

  // Retorna o seletor da tabela ou null se não encontrar uma tabela
  return element;
}
function getInnerText(el) {
  var sel,
    range,
    innerText = "";
  if (
    typeof document.selection != "undefined" &&
    typeof document.body.createTextRange != "undefined"
  ) {
    range = document.body.createTextRange();
    range.moveToElementText(el);
    innerText = range.text;
  } else if (
    typeof window.getSelection != "undefined" &&
    typeof document.createRange != "undefined"
  ) {
    sel = window.getSelection();
    sel.selectAllChildren(el);
    innerText = "" + sel;
    sel.removeAllRanges();
  }
  return innerText;
}
function tryToConvertStringToNumber(stringToConvert) {
  // Verifica se a string começa com o símbolo de moeda desejado
  const converter = (v) => {
    // Remove o símbolo de moeda e os pontos de separação de milhares
    const stringLimpa = v.replace(/[^\d,-]/g, "");

    // Substitui a vírgula por um ponto
    const stringPonto = stringLimpa.replace(",", ".");

    // Converte a string em número
    const numero = parseFloat(stringPonto);

    return numero.toString().replace(".", ",");
  };
  switch (true) {
    case stringToConvert.startsWith("R$") || stringToConvert.endsWith("KWP"):
      return converter(stringToConvert);
    case validaCPF(stringToConvert):
      return `=TEXTO("${stringToConvert}";"00000000000")`;
    case validaCNPJ(stringToConvert):
      return `=TEXTO("${stringToConvert}";"00000000000000")`;
    default:
      return `"${stringToConvert}"`;
  }
}
function getSelectedText(table) {
  let tableText = "";

  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    for (let j = 0; j < row.cells.length; j++) {
      const cell = row.cells[j];
      const cellText = getCellText(cell);
      tableText += cellText + "\t"; // Adiciona o texto da célula e uma tabulação
    }
    tableText += "\n"; // Adiciona uma quebra de linha após cada linha da tabela
  }

  return tableText;
}
function getCellText(cell) {
  let cellText = "";

  // Função recursiva para percorrer os elementos dentro da célula
  const traverse = (element) => {
    const tagName = element.tagName?.toLowerCase();
    if (element.nodeType === 3 || tagName === "p") {
      // Se for um nó de texto
      cellText +=
        cellText === ""
          ? `${tryToConvertStringToNumber(element.textContent.trim() || " ")}`
          : `\t${tryToConvertStringToNumber(
              element.textContent.trim() || " "
            )}`; // Adiciona o texto do nó de texto
    } else if (element.nodeType === 1) {
      // Se for um elemento HTML
      if (tagName === "div" || tagName === "p") {
        cellText += "\t"; // Adiciona um espaço antes de elementos div
      }
      // Percorre os elementos filhos
      for (let i = 0; i < element.childNodes.length; i++) {
        traverse(element.childNodes[i]);
      }
      if (element.childNodes.length === 0) {
        cellText += " ";
      }
      if (tagName === "div" || tagName === "p") {
        cellText += "\t"; // Adiciona um espaço após elementos div
      }
    }
  };

  traverse(cell);

  return cellText.trim();
}

window.addEventListener("contextmenu", (e) => {
  // e.preventDefault();
  const target = e.target;
  const verifyTableElement = getTableSelector(target);
  if (verifyTableElement) {
    const range = document.createRange();
    range.selectNode(verifyTableElement);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    // document.execCommand("copy");
    clipboard.writeText(getSelectedText(verifyTableElement));
    window.getSelection().removeAllRanges();
  }
  switch (target.tagName) {
    case "BUTTON":
    case "A":
    case "P":
    case "SPAN":
    case "DIV":
      ipcRenderer.send("rightClickApp", target.textContent.trim() ?? null);
      break;
    case "INPUT":
    case "TEXTAREA":
    case "SELECT":
      ipcRenderer.send("rightClickApp", target.value.trim() ?? null);
      break;
    default:
      ipcRenderer.send("rightClickApp", null);
      break;
  }
});
window.addEventListener("DOMContentLoaded", () => {
  window.ipc = ipcRenderer;
});

window.addEventListener("keypress", (e) => {
  switch (e.code) {
    case "F5":
      ipcRenderer.send("reloadApp");
      break;
    case "KeyR":
      if (e.ctrlKey) ipcRenderer.send("reinicializeApp");
      break;

    default:
      break;
  }
});
