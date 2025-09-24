const productCatalog = document.getElementById('products');
const categorias = document.getElementsByClassName('categorias')[0];
const arrow = document.getElementById('arrow');
let productDataArray = [];

// --- AJUSTE GLOBAL DE PRECIOS ---
const PRICE_ADJUST = 1.15; // 1 = sin cambio, 1.15 = +15%

// --- FETCH CSV ---
fetch('./data/products.csv')
    .then(r => r.text())
    .then(data => {
        productDataArray = parseCSV(data);
        renderProducts(productDataArray);
    })
    .catch(e => console.error('Error fetching CSV:', e));

function parseCSV(data) {
    const rows = data.split('\n').slice(1);
    return rows.filter(r => r.trim() !== "").map(row => {
        const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g;
        const matches = [...row.matchAll(regex)].map(m => m[0]);
        const cleanValues = matches.map(v => v.replace(/^"|"$/g,''));
        const [name, price, description, category, tags] = cleanValues;
        return { name, price, description, category: category?.trim() || '', tags: tags?.toLowerCase().trim() || '' };
    });
}

// --- RENDER PRODUCTS ---
function renderProducts(parsedProducts) {
    productCatalog.innerHTML = '';
    parsedProducts.forEach(product => {
        const el = document.createElement('div');
        el.classList.add('product');
        el.setAttribute('data-category', product.category);
        el.setAttribute('data-tags', product.tags);

        const formattedName = cleanText(product.name);
        const img = document.createElement('img');
        img.src = `./images/${formattedName}/0.webp`;
        img.alt = product.name;
        el.appendChild(img);

        const formattedPrice = (Number(product.price) * PRICE_ADJUST).toLocaleString('es-AR');
        el.innerHTML += `<h2>${product.name}</h2><p>$${formattedPrice}</p>`;

        productCatalog.appendChild(el);
    });

    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if(productName) openModalFromURL(productName);
}

// --- FILTER Y SEARCH ---
const searchbox = document.getElementById('searchbox');
searchbox.addEventListener('input', filterAndSearchProducts);
document.querySelectorAll('.categoria input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',filterAndSearchProducts));

function filterAndSearchProducts(){
    const query = searchbox.value.toLowerCase().trim();
    const keywords = query.split(/\s+/);
    const selectedCategories = Array.from(document.querySelectorAll('.categoria input[type="checkbox"]:checked'))
        .map(cb => cb.getAttribute('data-category'));
    document.querySelectorAll('.product').forEach(product=>{
        const tags = product.getAttribute('data-tags')||'';
        const cat = product.getAttribute('data-category');
        const matchesSearch = keywords.every(w=>tags.includes(w));
        const matchesCat = selectedCategories.length===0 || selectedCategories.includes(cat);
        product.style.display = matchesSearch && matchesCat ? 'flex':'none';
    });
}

// --- MODAL ---
const modal = document.querySelector('.modal');
const modalContent = document.querySelector('.modal-content');
const back = document.querySelector('#back');
let scrollY;

productCatalog.addEventListener('click', e=>{
    const productEl = e.target.closest('.product');
    if(!productEl) return;
    const productName = productEl.querySelector('h2').textContent;
    const productData = productDataArray.find(p=>cleanText(p.name)===cleanText(productName));
    if(productData) openModal(productData);
});

// --- SLIDER ---
async function loadGallery(formattedProductName){
    const gallery = modalContent.querySelector('.scroll-gallery');
    const dotsContainer = modalContent.querySelector('.dots-container');
    gallery.innerHTML = '';
    dotsContainer.innerHTML = '';

    let index = 1;
    const extensions = ["webp","jpg","png","jpeg"];
    const images = [];

    while(true){
        let found = false;
        for(let ext of extensions){
            const url = `./images/${formattedProductName}/${index}.${ext}`;
            try{
                const res = await fetch(url,{method:'HEAD'});
                if(res.ok){
                    found = true;
                    const slot = document.createElement('div');
                    slot.classList.add('image-slot');

                    const loader = document.createElement('div');
                    loader.classList.add('loader');
                    slot.appendChild(loader);
                    gallery.appendChild(slot);

                    const img = new Image();
                    img.src = url;
                    img.onload = ()=>{ loader.remove(); slot.appendChild(img); }
                    images.push(img);

                    // Dots
                    const dot = document.createElement('span');
                    dot.classList.add('dot');
                    if(index===1) dot.classList.add('active');
                    dotsContainer.appendChild(dot);
                    break;
                }
            }catch{}
        }
        if(!found) break;
        index++;
    }

    // Flechas
    const arrowLeft = modalContent.querySelector('.arrow-left');
    const arrowRight = modalContent.querySelector('.arrow-side');

    arrowLeft.addEventListener('click', ()=>slideGallery(-1));
    arrowRight.addEventListener('click', ()=>slideGallery(1));

    dotsContainer.querySelectorAll('.dot').forEach((dot,i)=>{
        dot.addEventListener('click',()=>gallery.scrollTo({left:i*gallery.clientWidth, behavior:'smooth'}));
    });

    function slideGallery(dir){
        const width = gallery.clientWidth;
        const scrollPos = gallery.scrollLeft;
        let newPos = scrollPos + dir*width;
        gallery.scrollTo({left:newPos, behavior:'smooth'});
    }

    // Sync dots
    gallery.addEventListener('scroll',()=>{
        const idx = Math.round(gallery.scrollLeft/gallery.clientWidth);
        dotsContainer.querySelectorAll('.dot').forEach((dot,i)=>dot.classList.toggle('active', i===idx));
    });
}

// --- ABRIR MODAL ---
function openModal(productData){
    if(!productData) return;

    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.paddingRight = `${window.innerWidth - document.body.clientWidth}px`;
    document.body.classList.add('no-scroll');
    modal.classList.remove('hidden');
    requestAnimationFrame(()=>modal.classList.add('appear'));

    modalContent.innerHTML = `
        <div class="scroll-gallery"></div>
        <button class="arrow-side">▶</button>
        <button class="arrow-left">◀</button>
        <div class="product-info">
            <h2>${productData.name}</h2>
            <p class="price">$${(Number(productData.price)*PRICE_ADJUST).toLocaleString('es-AR')}</p>
            <p class="description">${productData.description}</p>
        </div>
        <div class="dots-container"></div>
    `;

    loadGallery(cleanText(productData.name));
    history.pushState({modalOpen:true},'',`?producto=${cleanText(productData.name)}`);
}

function openModalFromURL(productName){
    const productData = productDataArray.find(p=>cleanText(p.name)===cleanText(productName));
    if(productData) openModal(productData);
}

function closeModal(){
    modal.classList.remove('appear');
    document.body.style.paddingRight = '0';
    document.body.classList.remove('no-scroll');
    modal.addEventListener('transitionend', ()=>modal.classList.add('hidden'), {once:true});
    window.scrollTo(0,scrollY);
    if(history.state?.modalOpen) history.replaceState(null,'',window.location.pathname);
}

modal.addEventListener('click', e=>{if(!modalContent.contains(e.target)) closeModal();});

window.addEventListener("popstate", ()=>{
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if(productName) openModalFromURL(productName);
    else closeModal();
});

// --- UTILS ---
function cleanText(text){
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_').toLowerCase();
}
