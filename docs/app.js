const productCatalog = document.getElementById('products');
const categorias = document.getElementsByClassName('categorias')[0];
const arrow = document.getElementById('arrow');
let productDataArray = [];

// --- AJUSTE GLOBAL DE PRECIOS ---
const PRICE_ADJUST = 1.15; // Ej: 1.15 = +15%, 1 = sin cambio

// --- FETCH CSV ---
fetch('./data/products.csv')
    .then(response => response.text())
    .then(data => {
        productDataArray = parseCSV(data);
        renderProducts(productDataArray);
    })
    .catch(error => console.error('Error fetching the CSV file:', error));

function parseCSV(data) {
    const rows = data.split('\n').slice(1);
    return rows.filter(r => r.trim() !== "").map(row => {
        const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g;
        const matches = [...row.matchAll(regex)].map(m => m[0]);
        const cleanValues = matches.map(v => v.replace(/^"|"$/g, ''));
        const [name, price, description, category, tags] = cleanValues;
        return { name, price, description, category: category?.trim() || '', tags: tags?.toLowerCase().trim() || '' };
    });
}

// --- RENDER PRODUCTS ---
function renderProducts(parsedProducts) {
    productCatalog.innerHTML = '';
    parsedProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.classList.add('product');
        productElement.setAttribute('data-category', product.category);
        productElement.setAttribute('data-tags', product.tags);

        const formattedName = cleanText(product.name);

        const img = document.createElement('img');
        img.src = `./images/${formattedName}/0.webp`;
        img.alt = product.name;

        productElement.appendChild(img);

        const formattedPrice = (Number(product.price) * PRICE_ADJUST).toLocaleString('es-AR');
        productElement.innerHTML += `<h2>${product.name}</h2><p>$${formattedPrice}</p>`;

        productCatalog.appendChild(productElement);
    });

    // Verificar URL
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if (productName) openModalFromURL(productName);
}

// --- FILTER Y SEARCH ---
const searchbox = document.getElementById('searchbox');
searchbox.addEventListener('input', filterAndSearchProducts);
document.querySelectorAll('.categoria input[type="checkbox"]').forEach(cb => cb.addEventListener('change', filterAndSearchProducts));

function filterAndSearchProducts() {
    const query = searchbox.value.toLowerCase().trim();
    const keywords = query.split(/\s+/);

    const selectedCategories = Array.from(document.querySelectorAll('.categoria input[type="checkbox"]:checked'))
        .map(cb => cb.getAttribute('data-category'));

    document.querySelectorAll('.product').forEach(product => {
        const tags = product.getAttribute('data-tags') || '';
        const productCategory = product.getAttribute('data-category');

        const matchesSearch = keywords.every(word => tags.includes(word));
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(productCategory);

        product.style.display = matchesSearch && matchesCategory ? 'flex' : 'none';
    });
}

// --- MENU CATEGORIAS ---
let isHidden = true;

function toggleCategorias() {
    categorias.classList.toggle('appear');
    arrow.classList.toggle('rotate180');
    isHidden = !isHidden;

    if (isHidden) {
        categorias.style.transform = "translateY(0)";
        productCatalog.style.transform = "translateY(0)";
    } else {
        categorias.style.transform = `translateY(20px)`;
        productCatalog.style.transform = `translateY(${categorias.clientHeight + 20}px)`;
    }
}

let prev_width = window.innerWidth;
let prev_categories_height = categorias.clientHeight;

window.addEventListener('resize', () => {
    if (window.innerWidth > 800 && prev_width <= 800 && !isHidden) toggleCategorias();
    else if (categorias.clientHeight !== prev_categories_height && !isHidden) {
        productCatalog.style.transform = `translateY(${categorias.clientHeight + 20}px)`;
        prev_categories_height = categorias.clientHeight;
    }
    prev_width = window.innerWidth;
});

// --- MODAL POPUP ---
const modal = document.querySelector('.modal');
const modalContent = document.querySelector('.modal-content');
const back = document.querySelector('#back');
let scrollY;

productCatalog.addEventListener('click', (event) => {
    const productElement = event.target.closest('.product');
    if (!productElement) return;
    const productName = productElement.querySelector('h2').textContent;
    const productData = productDataArray.find(p => cleanText(p.name) === cleanText(productName));
    if (productData) openModal(productData);
});

// --- LIMPIAR Y CARGAR GALERÍA ---
async function loadGallery(formattedProductName) {
    const galleryContainer = modalContent.querySelector('.scroll-gallery');
    galleryContainer.innerHTML = ''; // limpio

    const dotsContainer = modalContent.querySelector('.dots-container');
    dotsContainer.innerHTML = '';

    let index = 1;
    const images = [];
    const extensions = ["webp","jpg","png","jpeg"];

    while (true) {
        let found = false;
        for (let ext of extensions) {
            const url = `./images/${formattedProductName}/${index}.${ext}`;
            try {
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) {
                    found = true;
                    const slot = document.createElement('div');
                    slot.classList.add('image-slot');

                    const loader = document.createElement('div');
                    loader.classList.add('loader');
                    slot.appendChild(loader);

                    galleryContainer.appendChild(slot);

                    const img = new Image();
                    img.src = url;
                    img.onload = () => { loader.remove(); slot.appendChild(img); }
                    images.push(img);

                    // dots
                    const dot = document.createElement('span');
                    dot.classList.add('dot');
                    if (index === 1) dot.classList.add('active');
                    dotsContainer.appendChild(dot);
                    break;
                }
            } catch {}
        }
        if (!found) break;
        index++;
    }

    // scroll dots update
    galleryContainer.addEventListener('scroll', () => {
        const activeIndex = Math.round(galleryContainer.scrollLeft / galleryContainer.clientWidth);
        dotsContainer.querySelectorAll('.dot').forEach((dot,i)=> dot.classList.toggle('active', i===activeIndex));
    });

    // click dots
    dotsContainer.querySelectorAll('.dot').forEach((dot,i)=>{
        dot.addEventListener('click', ()=> {
            galleryContainer.scrollTo({ left:i*galleryContainer.clientWidth, behavior:'smooth' });
        });
    });
}

// --- ABRIR MODAL ---
function openModal(productData) {
    if (!productData) return;

    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.paddingRight = `${window.innerWidth - document.body.clientWidth}px`;
    back.style.top = "0";
    document.body.classList.add('no-scroll');

    modal.classList.remove('hidden');
    requestAnimationFrame(()=> modal.classList.add('appear'));

    modalContent.innerHTML = `
        <div class="scroll-gallery"></div>
        <div class="product-info">
            <h2>${productData.name}</h2>
            <p class="price">$${(Number(productData.price)*PRICE_ADJUST).toLocaleString('es-AR')}</p>
            <p class="description">${productData.description}</p>
        </div>
        <div class="dots-container"></div>
    `;

    loadGallery(cleanText(productData.name));

    history.pushState({ modalOpen:true }, '', `?producto=${cleanText(productData.name)}`);
}

// --- ABRIR DESDE URL ---
function openModalFromURL(productName) {
    const productData = productDataArray.find(p => cleanText(p.name) === cleanText(productName));
    if (productData) openModal(productData);
}

// --- CERRAR MODAL ---
function closeModal() {
    modal.classList.remove('appear');
    document.body.style.paddingRight = `0`;
    document.body.classList.remove('no-scroll');

    modal.addEventListener('transitionend', ()=>{
        modal.classList.add('hidden');
    }, { once:true });

    window.scrollTo(0, scrollY);

    if (history.state?.modalOpen) history.replaceState(null,'',window.location.pathname);
}

modal.addEventListener('click',(e)=>{ if(!modalContent.contains(e.target)) closeModal(); });

window.addEventListener("popstate", (event)=>{
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if(productName) openModalFromURL(productName);
    else closeModal();
});

// --- UTILS ---
function cleanText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"_").toLowerCase();
}
