const productCatalog = document.getElementById('products');
const categorias = document.getElementsByClassName('categorias')[0];
const arrow = document.getElementById('arrow');
let productDataArray = [];

// Ajuste general de precios
const PRICE_ADJUST = 1.15; // 15% de aumento global

fetch('./data/products.csv')
    .then(response => response.text())
    .then(data => {
        productDataArray = parseCSV(data);
        renderProducts(productDataArray);
    })
    .catch(error => console.error('Error fetching the CSV file:', error));

function parseCSV(data) {
    const rows = data.split('\n').slice(1); // Omitir la cabecera

    return rows
        .filter(row => row.trim() !== "") // Ignorar líneas vacías
        .map(row => {
            const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g;
            const matches = [...row.matchAll(regex)].map(m => m[0]);
            const cleanValues = matches.map(value => value.replace(/^"|"$/g, ''));
            const [name, price, description, category, tags] = cleanValues;

            return {
                name,
                price,
                description,
                category: category ? category.trim() : '',
                tags: tags ? tags.toLowerCase().trim() : ''
            };
        });
}

async function renderProducts(parsedProducts) {
    productCatalog.innerHTML = '';
    for (const product of parsedProducts) {
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
        productElement.innerHTML += `
            <h2>${product.name}</h2>
            <p>$${formattedPrice}</p>
        `;

        productCatalog.appendChild(productElement);
    }

    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if (productName) {
        openModalFromURL(productName);
    }
}

function filterAndSearchProducts() {
    const query = searchbox.value.toLowerCase().trim();
    const keywords = query.split(/\s+/);

    const selectedCategories = Array.from(document.querySelectorAll('.categoria input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.getAttribute('data-category'));

    document.querySelectorAll('.product').forEach(product => {
        const tags = product.getAttribute('data-tags') || '';
        const productCategory = product.getAttribute('data-category');
        const matchesSearch = keywords.every(word => tags.includes(word));
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(productCategory);
        product.style.display = matchesSearch && matchesCategory ? 'flex' : 'none';
    });
}

const searchbox = document.getElementById('searchbox');
searchbox.addEventListener('input', filterAndSearchProducts);
document.querySelectorAll('.categoria input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', filterAndSearchProducts);
});

// menu categorias
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
    if (window.innerWidth > 800 && prev_width <= 800 && !isHidden) {
        toggleCategorias();
    } else if (categorias.clientHeight !== prev_categories_height && !isHidden) {
        productCatalog.style.transform = `translateY(${categorias.clientHeight + 20}px)`;
        prev_categories_height = categorias.clientHeight;
    }
    prev_width = window.innerWidth;
});

// MODAL POPUP
const modal = document.querySelector('.modal');
const modalContent = document.querySelector('.modal-content');
const back = document.querySelector('#back');
let scrollY;

productCatalog.addEventListener('click', (event) => {
    const productElement = event.target.closest('.product');
    if (!productElement) return;

    const productName = productElement.querySelector('h2').textContent;
    const productData = productDataArray.find(p => cleanText(p.name) === cleanText(productName));

    if (productData) {
        openModal(productData);
    }
});

async function loadImage(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) return null;
        return url;
    } catch {
        return null;
    }
}

async function loadGallery(formattedProductName) {
    const modalContent = document.querySelector('.modal-content');
    const loader = document.createElement('div');
    loader.classList.add('loader');
    modalContent.appendChild(loader);

    const galleryContainer = document.createElement('div');
    galleryContainer.classList.add('scroll-gallery');

    let index = 1;
    let images = [];

    while (true) {
        const imageUrl = `./images/${formattedProductName}/${index}.webp`;
        const loadedImage = await loadImage(imageUrl);
        if (!loadedImage) break;
        const img = document.createElement("img");
        img.src = loadedImage;
        img.alt = `${formattedProductName} ${index}`;
        galleryContainer.appendChild(img);
        images.push(img);
        index++;
    }

    loader.remove();

    const dotsContainer = document.createElement('div');
    dotsContainer.classList.add('dots-container');

    images.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dotsContainer.appendChild(dot);
    });

    modalContent.prepend(galleryContainer);
    modalContent.appendChild(dotsContainer);

    galleryContainer.addEventListener('scroll', () => {
        const scrollPosition = galleryContainer.scrollLeft;
        const imageWidth = galleryContainer.clientWidth;
        const activeIndex = Math.round(scrollPosition / imageWidth);
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === activeIndex);
        });
    });

    dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
            const imageWidth = galleryContainer.clientWidth;
            galleryContainer.scrollTo({
                left: i * imageWidth,
                behavior: 'smooth',
            });
        });
    });

    fetch("./images/icons/arrow-side.svg")
        .then(res => res.text())
        .then(data => {
            let arrowRight = new DOMParser().parseFromString(data, "image/svg+xml").querySelector("svg");
            let arrowLeft = new DOMParser().parseFromString(data, "image/svg+xml").querySelector("svg");
            arrowRight.classList.add("arrow-side");
            arrowLeft.classList.add("arrow-side", "arrow-left");
            modalContent.appendChild(arrowRight);
            modalContent.appendChild(arrowLeft);

            modalContent.addEventListener("click", (event) => {
                const scrollAmount = galleryContainer.clientWidth;
                if (event.target.closest(".arrow-side")) {
                    if (event.target.closest(".arrow-left")) {
                        galleryContainer.scrollBy({ left: -scrollAmount });
                    } else {
                        galleryContainer.scrollBy({ left: scrollAmount });
                    }
                }
            });
        })
        .catch(err => console.error("Error:", err));
}

function openModal(productData) {
    if (!productData) return;

    const modalContent = document.querySelector('.modal-content');

    // primero info del producto
    modalContent.innerHTML = `
        <div class="product-info">
            <h2>${productData.name}</h2>
            <p class="price">$${(Number(productData.price) * PRICE_ADJUST).toLocaleString('es-AR')}</p>
            <p class="description">${productData.description}</p>
        </div>
    `;

    // después la galería
    loadGallery(cleanText(productData.name));

    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.paddingRight = `${window.innerWidth - document.body.clientWidth}px`;
    back.style.top = "0";
    document.body.classList.add('no-scroll');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('appear');
    });

    history.pushState({ modalOpen: true }, '', `?producto=${cleanText(productData.name)}`);
}

function openModalFromURL(productName) {
    const productData = productDataArray.find(p => cleanText(p.name) === cleanText(productName));
    if (productData) openModal(productData);
}

function closeModal() {
    modal.classList.remove('appear');
    document.body.style.paddingRight = `0`;
    document.body.classList.remove('no-scroll');

    modal.addEventListener('transitionend', () => {
        modal.classList.add('hidden');
    }, { once: true });

    window.scrollTo(0, scrollY);

    if (history.state?.modalOpen) {
        history.replaceState(null, '', window.location.pathname);
    }
}

modal.addEventListener('click', (event) => {
    if (!modalContent.contains(event.target)) {
        closeModal();
    }
});

window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if (productName) {
        openModalFromURL(productName);
    } else {
        closeModal();
    }
});

function cleanText(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
}
