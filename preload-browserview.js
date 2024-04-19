const { ipcRenderer, clipboard } = require("electron");
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
  if (stringToConvert.startsWith("R$") || stringToConvert.endsWith("KWP")) {
    return converter(stringToConvert);
  } else {
    // Retorna NaN se a string não estiver no formato de dinheiro
    return stringToConvert;
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
    if (element.nodeType === 3) {
      // Se for um nó de texto
      cellText +=
        cellText === ""
          ? `${tryToConvertStringToNumber(element.textContent.trim())}`
          : `\t${tryToConvertStringToNumber(element.textContent.trim())}`; // Adiciona o texto do nó de texto
    } else if (element.nodeType === 1) {
      // Se for um elemento HTML
      const tagName = element.tagName.toLowerCase();
      if (tagName === "div") {
        cellText += " "; // Adiciona um espaço antes de elementos div
      }
      // Percorre os elementos filhos
      for (let i = 0; i < element.childNodes.length; i++) {
        traverse(element.childNodes[i]);
      }
      if (tagName === "div") {
        cellText += " "; // Adiciona um espaço após elementos div
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
