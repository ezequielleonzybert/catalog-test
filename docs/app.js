const productCatalog = document.getElementById('products');
const categorias = document.getElementsByClassName('categorias')[0];
const arrow = document.getElementById('arrow');
let productDataArray = [];

let priceMultiplier = 4500

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
            // Expresión regular para dividir en comas, ignorando las dentro de comillas
            const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g;
            const matches = [...row.matchAll(regex)].map(m => m[0]);

            // Eliminar comillas externas si hay
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
        img.src = `./images/${formattedName}/0.webp`
        img.alt = product.name;

        productElement.appendChild(img);

        const formattedPrice = Number(product.price * priceMultiplier).toLocaleString('es-AR');
        productElement.innerHTML += `
            <h2>${product.name}</h2>
            <p>$${formattedPrice}</p>
        `;

        productCatalog.appendChild(productElement);
    }

    // Una vez que los productos están en el DOM, verificamos la URL
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');
    if (productName) {
        openModalFromURL(productName);
    }
}


function filterAndSearchProducts() {
    const query = searchbox.value.toLowerCase().trim();
    const keywords = query.split(/\s+/); // Divide en palabras separadas

    const selectedCategories = Array.from(document.querySelectorAll('.categoria input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.getAttribute('data-category'));

    document.querySelectorAll('.product').forEach(product => {
        const tags = product.getAttribute('data-tags') || '';
        const productCategory = product.getAttribute('data-category');

        // Verifica si todas las palabras están en los tags
        const matchesSearch = keywords.every(word => tags.includes(word));

        // Verifica si el producto pertenece a una de las categorías seleccionadas
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(productCategory);

        // Mostrar solo si cumple ambas condiciones
        product.style.display = matchesSearch && matchesCategory ? 'flex' : 'none';
    });
}

// Conectar la función a los eventos de búsqueda y selección de categorías
const searchbox = document.getElementById('searchbox');
searchbox.addEventListener('input', filterAndSearchProducts);
document.querySelectorAll('.categoria input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', filterAndSearchProducts);
});

//menu categorias
let isHidden = true;

function toggleCategorias() {
    categorias.classList.toggle('appear');
    arrow.classList.toggle('rotate180');
    isHidden = !isHidden;

    if (isHidden) {
        categorias.style.transform = "translateY(0)";
        productCatalog.style.transform = "translateY(0)";
    }
    else {
        categorias.style.transform = `translateY(20px)`;
        productCatalog.style.transform = `translateY(${categorias.clientHeight + 20}px)`;
    }

}

let prev_width = window.innerWidth;
let prev_categories_height = categorias.clientHeight;

window.addEventListener('resize', () => {
    if (window.innerWidth > 800 && prev_width <= 800 && !isHidden) {
        toggleCategorias();
    }
    else if (categorias.clientHeight !== prev_categories_height && !isHidden) {
        productCatalog.style.transform = `translateY(${categorias.clientHeight + 20}px)`;
        prev_categories_height = categorias.clientHeight;
    }
    prev_width = window.innerWidth;
});

//MODAL POPUP

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

        if (!loadedImage) break; // Si no se encuentra, termina el bucle
        const img = document.createElement("img");
        img.src = loadedImage;
        img.alt = `${formattedProductName} ${index}`;
        galleryContainer.appendChild(img);
        images.push(img);
        index++;
    }

    loader.remove();

    // Crear el contenedor de puntos
    const dotsContainer = document.createElement('div');
    dotsContainer.classList.add('dots-container');

    // Crear los puntos según la cantidad de imágenes
    images.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active'); // Marcar el primer punto como activo
        dotsContainer.appendChild(dot);
    });

    // Insertar la galería y los puntos en el modal
    modalContent.prepend(galleryContainer);
    modalContent.appendChild(dotsContainer);

    // Actualizar los puntos al desplazarse
    galleryContainer.addEventListener('scroll', () => {
        const scrollPosition = galleryContainer.scrollLeft;
        const imageWidth = galleryContainer.clientWidth;
        const activeIndex = Math.round(scrollPosition / imageWidth);

        // Actualizar los puntos
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            if (i === activeIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    });

    // Permitir hacer clic en los puntos para desplazarse
    dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
            const imageWidth = galleryContainer.clientWidth;
            galleryContainer.scrollTo({
                left: i * imageWidth,
                behavior: 'smooth', // Desplazamiento suave
            });
        });
    });

    //ARROW-SIDE
    fetch("./images/icons/arrow-side.svg")
        .then(res => res.text())
        .then(data => {
            let arrowRight = new DOMParser().parseFromString(data, "image/svg+xml").querySelector("svg");
            let arrowLeft = new DOMParser().parseFromString(data, "image/svg+xml").querySelector("svg");
            arrowRight.classList.add("arrow-side");
            arrowLeft.classList.add("arrow-side", "arrow-left")
            document.querySelector(".modal-content").appendChild(arrowRight);
            document.querySelector(".modal-content").appendChild(arrowLeft);

            // Agregar event listener después de insertar las flechas
            modalContent.addEventListener("click", (event) => {
                const scrollAmount = galleryContainer.clientWidth; // Se mueve por el ancho de la galería

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

    loadGallery(cleanText(productData.name));

    const formattedPrice = Number(productData.price * priceMultiplier).toLocaleString('es-AR');
    modalContent.innerHTML = `
        <div class="product-info">
            <h2>${productData.name}</h2>
            <p class="price">$${formattedPrice}</p>
            <p class="description">${productData.description}</p>
        </div>
    `;

    // Mostrar el modal
    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.paddingRight = `${window.innerWidth - document.body.clientWidth}px`;
    back.style.top = "0";
    document.body.classList.add('no-scroll');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('appear');
    });

    // Guardar en la URL
    history.pushState({ modalOpen: true }, '', `?producto=${cleanText(productData.name)}`);
}

function openModalFromURL(productName) {
    const productData = productDataArray.find(p => cleanText(p.name) === cleanText(productName));

    if (productData) {
        openModal(productData);
    }
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
        history.replaceState(null, '', window.location.pathname); // Elimina el parámetro sin afectar el historial
    }
}

modal.addEventListener('click', (event) => {
    if (!modalContent.contains(event.target)) {
        closeModal();
    }
});

window.addEventListener("popstate", (event) => {
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('producto');

    if (productName) {
        openModalFromURL(productName); // Reabre el modal si hay un producto en la URL
    } else {
        closeModal();
    }
});

function cleanText(texto) {
    return texto
        .normalize("NFD") // Descompone caracteres con tildes
        .replace(/[\u0300-\u036f]/g, "") // Elimina las tildes
        .replace(/\s+/g, "_") // Elimina los espacios
        .toLowerCase();
}

// function enableDragScroll(galleryContainer) {
//     let isDragging = false;
//     let startX, scrollLeft;

//     galleryContainer.addEventListener('mousedown', (e) => {
//         isDragging = true;
//         startX = e.pageX;
//         scrollLeft = galleryContainer.scrollLeft;
//         galleryContainer.style.cursor = 'grabbing';
//         e.preventDefault();
//     });

//     galleryContainer.addEventListener('mouseleave', () => {
//         if (isDragging) {
//             isDragging = false;
//             galleryContainer.style.cursor = 'grab';
//             snapToNearestImage(galleryContainer)
//         }
//     });

//     galleryContainer.addEventListener('mouseup', () => {
//         if (isDragging) {
//             isDragging = false;
//             galleryContainer.style.cursor = 'grab';
//             snapToNearestImage(galleryContainer)
//         }
//     });

//     galleryContainer.addEventListener('mousemove', (e) => {
//         if (!isDragging) return;
//         e.preventDefault();
//         const x = e.pageX;
//         const walk = (x - startX) * 1.5;
//         galleryContainer.scrollLeft = scrollLeft - walk;
//     });
// }

// function snapToNearestImage(galleryContainer) {
//     const images = galleryContainer.querySelectorAll('img');
//     const galleryScrollLeft = galleryContainer.scrollLeft;
//     const galleryWidth = galleryContainer.clientWidth;

//     let closestImage = null;
//     let closestDistance = Infinity;

//     // Encuentra la imagen más cercana al scroll actual
//     images.forEach((img, index) => {
//         const imgLeft = index * galleryWidth; // Posición de la imagen
//         const distance = Math.abs(galleryScrollLeft - imgLeft);

//         if (distance < closestDistance) {
//             closestDistance = distance;
//             closestImage = img;
//         }
//     });

//     // Ajusta el scroll a la imagen más cercana
//     if (closestImage) {
//         const targetScrollLeft = Array.from(images).indexOf(closestImage) * galleryWidth;
//         galleryContainer.scrollTo({
//             left: targetScrollLeft,
//             behavior: 'smooth', // Desplazamiento suave
//         });
//     }
// }

//LOADER ANIMATION

// window.addEventListener('load', () => {
//     setTimeout(() => {
//         const pageLoader = document.getElementById('page-loader');

//         // Oculta el loader
//         pageLoader.style.display = 'none';

//         // Muestra el contenido
//         document.body.classList.remove('hidden');
//     }, 1500); // 2000 milisegundos = 2 segundos
// });