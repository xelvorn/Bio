const msApiUrl = "https://www.microsoft.com/software-download-connector/api/"
const parms = "?profile=606624d44113&Locale=en-US&sessionID="
const sessionUrl = "https://vlscppe.microsoft.com/fp/tags?org_id=y6jn8c31&session_id="

const apiUrl = "https://api.gravesoft.dev/msdl/"

const sessionId = document.getElementById('msdl-session-id');
const msContent = document.getElementById('msdl-ms-content');
const pleaseWait = document.getElementById('msdl-please-wait');
const processingError = document.getElementById('msdl-processing-error');

const productsList = document.getElementById('products-list');
const backToProductsDiv = document.getElementById('back-to-products');

const sharedSessionGUID = "47cbc254-4a79-4be6-9866-9c625eb20911";

let availableProducts = {};
let sharedSession = false;
let shouldUseSharedSession = true;
let skuId;

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function updateVars() {
    let id = document.getElementById('product-languages').value;
    if (id == "") {
        document.getElementById('submit-sku').disabled = 1;
        return;
    }

    document.getElementById('submit-sku').disabled = 0;

    return JSON.parse(id)['id'];
}

function langJsonStrToHTML(jsonStr) {
    let json = JSON.parse(jsonStr);
    let container = document.createElement('div');

    let header = document.createElement('h2');
    header.textContent = "Select the product language";
    container.appendChild(header);

    let info = document.createElement('p');
    info.innerHTML = "You'll need to choose the same language when you install Windows. To see what language you're currently using, go to <strong>Time and language</strong> in PC settings or <strong>Region</strong> in Control Panel.";
    container.appendChild(info);

    let select = document.createElement('select');
    select.id = "product-languages";

    let defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.selected = "selected";
    defaultOption.textContent = "Choose one";
    select.appendChild(defaultOption);

    json.Skus.forEach(sku => {
        let option = document.createElement('option');
        option.value = JSON.stringify({ id: sku.Id });
        option.textContent = sku.LocalizedLanguage;
        select.appendChild(option);
    });

    container.appendChild(select);

    let button = document.createElement('button');
    button.id = "submit-sku";
    button.textContent = "Submit";
    button.disabled = true;
    button.setAttribute("onClick", "getDownload();");

    container.appendChild(button);

    return container.innerHTML;
}

function onLanguageXhrChange() {
    if (!(this.status == 200))
        return;

    if (pleaseWait.style.display != "block")
        return;

    pleaseWait.style.display = "none";
    msContent.style.display = "block";

    let langHtml = langJsonStrToHTML(this.responseText);

    msContent.innerHTML = langHtml

    let submitSku = document.getElementById('submit-sku');
    submitSku.setAttribute("onClick", "getDownload();");

    let prodLang = document.getElementById('product-languages');
    prodLang.setAttribute("onChange", "updateVars();");

    updateVars();
}

function onDownloadsXhrChange() {
    if (!(this.status == 200)) return;

    let response = JSON.parse(this.responseText)

    let wasSuccessful = true;
    if (response.Errors || response.ValidationContainer.Errors) {
        processingError.style.display = "block";
        wasSuccessful = false;
    }

    if (pleaseWait.style.display != "block") return;

    if (wasSuccessful) {
        pleaseWait.style.display = "none";
    } else if (!sharedSession && shouldUseSharedSession) {
        useSharedSession();
        return;
    } else {
        getFromServer();
        return;
    }

    msContent.innerHTML = "";
    msContent.style.display = "block";

    if (response.ProductDownloadOptions && response.ProductDownloadOptions.length > 0) {
        response.ProductDownloadOptions.forEach(option => {
            let optionContainer = document.createElement('div');

            let header = document.createElement('h1');
            header.textContent = `Windows 11 ${option.LocalizedLanguage}`

            let downloadButton = document.createElement('a');
            downloadButton.href = option.Uri;
            downloadButton.textContent = `Download ${option.LocalizedProductDisplayName}`;
            downloadButton.target = "_blank";
            optionContainer.appendChild(downloadButton);

            msContent.appendChild(optionContainer);
        });
    } else {
        msContent.innerHTML = "<p>No download options available.</p>";
    }
}

function getFromServer() {
    processingError.style.display = "none";
    let url = apiUrl + "proxy" + "?product_id=" + window.location.hash.substring(1) +
        "&sku_id=" + skuId;
    let xhr = new XMLHttpRequest();
    xhr.onload = displayResponseFromServer;
    xhr.open("GET", url, true);
    xhr.send();
}

function getFileNameFromLink(link) {
    let raw_link = link.split('?')[0];
    return raw_link.split('/').pop();
}

function displayResponseFromServer() {
    pleaseWait.style.display = "none";

    const response = JSON.parse(this.responseText);

    if (this.status !== 200) {
        processingError.style.display = "block";
        alert(response["Error"])
        return;
    }

    msContent.innerHTML = "";
    msContent.style.display = "block";

    if (response.ProductDownloadOptions && response.ProductDownloadOptions.length > 0) {
        let header = document.createElement('h2');
        header.textContent = `${response.ProductDownloadOptions[0].ProductDisplayName} ${response.ProductDownloadOptions[0].LocalizedLanguage}`
        msContent.appendChild(header);
            
        response.ProductDownloadOptions.forEach(option => {
            let downloadButton = document.createElement('a');
            downloadButton.href = option.Uri;
            downloadButton.textContent = getFileNameFromLink(option.Uri);
            downloadButton.target = "_blank";
    
            let br = document.createElement('br');
    
            msContent.appendChild(downloadButton);
            msContent.appendChild(br);
        });
    } else {
        msContent.innerHTML = "<p>No download options available.</p>";
    }
}

function getLanguages(productId) {
    let url = `${msApiUrl}getskuinformationbyproductedition${parms}${sessionId.value}&ProductEditionId=${productId}`;
    let xhr = new XMLHttpRequest();
    xhr.onload = onLanguageXhrChange;
    xhr.open("GET", url, true);
    xhr.send();
}

function getDownload() {
    msContent.style.display = "none";
    pleaseWait.style.display = "block";

    skuId = skuId ? skuId : updateVars();

    let url = `${msApiUrl}GetProductDownloadLinksBySku${parms}${sessionId.value}&SKU=${skuId}`;

    let xhr = new XMLHttpRequest();
    xhr.onload = onDownloadsXhrChange;
    xhr.open("GET", url, true);
    xhr.send();
}

function backToProducts() {
    backToProductsDiv.style.display = 'none';
    productsList.style.display = 'block';
    msContent.style.display = 'none';
    pleaseWait.style.display = 'none';
    processingError.style.display = 'none';

    window.location.hash = "";
    skuId = null;
}

function useSharedSession() {
    sharedSession = true;
    retryDownload();
}

function retryDownload() {
    pleaseWait.style.display = "block";
    processingError.style.display = 'none';
    let productId = window.location.hash.substring(1);
    let url = `${msApiUrl}getskuinformationbyproductedition${parms}${sharedSessionGUID}&ProductEditionId=${productId}`;
    let xhr = new XMLHttpRequest();
    xhr.onload = getDownload;
    xhr.open("GET", url);
    xhr.send();
}

function prepareDownload(id) {
    productsList.style.display = 'none';
    backToProductsDiv.style.display = 'block';
    pleaseWait.style.display = "block";

    const xhr = new XMLHttpRequest();
    xhr.onerror = () => { getLanguages(id) };
    xhr.open("GET", sessionUrl + sessionId.value, true);
    xhr.send();
}

function addTableElement(table, value, data) {
    let a = document.createElement('a')
    a.href = "#" + value;
    a.setAttribute("onClick", "prepareDownload(" + value + ");");
    a.appendChild(document.createTextNode(data[value]))

    let tr = table.insertRow();

    let td = tr.insertCell();
    td.appendChild(a);

    let td2 = tr.insertCell();
    td2.appendChild(document.createTextNode(value))
}

function createTable(data, search) {
    let table = document.getElementById('products-table-body');
    let regex = new RegExp('' + search + '', 'ig');

    table.innerHTML = "";

    for (value in data) {
        if (data[value].match(regex) == null)
            continue;

        addTableElement(table, value, data);
    }
}

function updateResults() {
    let search = document.getElementById('search-products');
    createTable(availableProducts, search.value);
}

function setSearch(query) {
    let search = document.getElementById('search-products');
    search.value = search.value == query ? null : query;
    updateResults();
}

function checkHash() {
    let hash = window.location.hash;
    if (hash.length == 0)
        return

    prepareDownload(hash.substring(1))
}

function preparePage(resp) {
    availableProducts = JSON.parse(resp);
    if (!availableProducts) {
        pleaseWait.style.display = 'none';
        processingError.style.display = 'block';
        return;
    }

    pleaseWait.style.display = 'none';
    productsList.style.display = 'block';

    updateResults();
    checkHash();
}

sessionId.value = uuidv4();

let xhr = new XMLHttpRequest();

xhr.onload = function () {
    if (this.status != 200) {
        pleaseWait.style.display = 'none';
        processingError.style.display = 'block';
        return;
    }

    preparePage(this.responseText);
};

xhr.open("GET", 'data/products.json', true);
xhr.send();

pleaseWait.style.display = 'block';

let mxhr = new XMLHttpRequest();

mxhr.onload = function () {
    if (this.status != 200) {
        shouldUseSharedSession = false;
    }
};
mxhr.open("GET", apiUrl + "use_shared_session", true);
mxhr.send();
