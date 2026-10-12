import {
    db, serverTimestamp, createOrderWithStock,
    getProducts, getCategories, getSettings, applySettingsToPage,
    productCardHTML, escapeHTML, discountPercent
} from "./store.js";


// ============================================================================
// LOAD STORE DATA (products, categories, settings) + RENDER
// ============================================================================

const productContainer = document.querySelector(".product-container#products-grid") ||
    document.querySelector("#products .product-container");

let allProducts = [];
let allCategories = [];
let activeFilter = "all";


function renderFilterButtons() {

    const bar = document.querySelector("#product-filter");

    if (!bar) return;

    // Only show categories that actually have products
    const used = allCategories.filter(function (c) {
        return allProducts.some(function (p) { return p.category === c.slug; });
    });

    bar.innerHTML =
        `<button class="filter-btn ${activeFilter === "all" ? "active" : ""}" data-filter="all">All</button>` +
        `<button class="filter-btn ${activeFilter === "sale" ? "active" : ""}" data-filter="sale">Sale</button>` +
        used.map(function (c) {
            return `<button class="filter-btn ${activeFilter === c.slug ? "active" : ""}" data-filter="${escapeHTML(c.slug)}">${escapeHTML(c.name)}</button>`;
        }).join("");
}


function renderProducts() {

    if (!productContainer) return;

    const list = allProducts.filter(function (p) {
        if (activeFilter === "all") return true;
        if (activeFilter === "sale") return discountPercent(p) > 0;
        return p.category === activeFilter;
    });

    productContainer.innerHTML = list.length
        ? list.map(productCardHTML).join("")
        : `<p class="no-products">No products found in this category yet.</p>`;
}


function renderLanding(settings) {

    // Hero
    const hero = document.querySelector("#hero-image");
    if (hero && settings.heroImage) hero.src = settings.heroImage;

    const statProducts = document.querySelector("#stat-products");
    if (statProducts) statProducts.textContent = allProducts.length + "+";

    // Category cards
    const grid = document.querySelector("#category-grid");

    if (grid) {

        const cards = allCategories.map(function (c) {

            const items = allProducts.filter(function (p) { return p.category === c.slug; });

            if (!items.length) return "";

            return `
            <a href="#products" class="category-card" data-category="${escapeHTML(c.slug)}">
                <img src="${escapeHTML(items[0].image)}" alt="${escapeHTML(c.name)}" loading="lazy">
                <div class="category-card-text">
                    <h3>${escapeHTML(c.name)}</h3>
                    <span>${items.length} item${items.length === 1 ? "" : "s"} <i class="fa-solid fa-arrow-right"></i></span>
                </div>
            </a>`;

        }).join("");

        grid.innerHTML = cards;

        grid.closest("section").hidden = !cards;
    }

    // Featured
    const featured = allProducts.filter(function (p) { return p.featured; }).slice(0, 8);
    const featuredSection = document.querySelector("#featured-section");

    if (featuredSection) {
        featuredSection.hidden = featured.length === 0;
        document.querySelector("#featured-container").innerHTML = featured.map(productCardHTML).join("");
    }

    // Sale banner
    const maxOff = Math.max(0, ...allProducts.map(discountPercent));
    const saleBanner = document.querySelector("#sale-banner");

    if (saleBanner) {
        saleBanner.hidden = maxOff === 0;
        document.querySelector("#sale-max").textContent = maxOff + "%";
    }
}


function setFilter(category, scroll) {

    activeFilter = category;

    renderFilterButtons();
    renderProducts();

    if (scroll) {
        document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
    }
}


async function initStore() {

    const settings = await getSettings();

    applySettingsToPage(settings);

    [allProducts, allCategories] = await Promise.all([getProducts(), getCategories()]);

    renderFilterButtons();
    renderProducts();
    renderLanding(settings);
}


// Filter buttons
document.addEventListener("click", function (event) {

    const filterBtn = event.target.closest(".filter-btn");

    if (filterBtn) {
        setFilter(filterBtn.dataset.filter, false);
        return;
    }

    const categoryCard = event.target.closest(".category-card");

    if (categoryCard) {
        event.preventDefault();
        setFilter(categoryCard.dataset.category, true);
        return;
    }

    if (event.target.closest("[data-filter-sale]")) {
        event.preventDefault();
        setFilter("sale", true);
    }
});


initStore();



// =========================
// SIZE SELECTION
// =========================

document.addEventListener(
    "click",
    function (event) {

        if (
            !event.target.classList.contains(
                "size-btn"
            )
        ) {

            return;

        }


        const button =
            event.target;


        const productCard =
            button.closest(".product-card");


        const allSizeButtons =
            productCard.querySelectorAll(
                ".size-btn"
            );


        const sizeError =
            productCard.querySelector(
                ".size-error"
            );


        // Remove active
        allSizeButtons.forEach(function (btn) {

            btn.classList.remove("active");

        });


        // Selected size
        button.classList.add("active");


        // Hide error
        if (sizeError) {

            sizeError.style.display =
                "none";

        }

    }
);



// =========================
// ADD TO CART
// =========================

document.addEventListener(
    "click",
    function (event) {

        if (
            !event.target.closest(".add-cart")
        ) {

            return;

        }


        const button =
            event.target.closest(".add-cart");


        const productCard =
            button.closest(".product-card");


        // Selected size
        const selectedSize =
            productCard.querySelector(
                ".size-btn.active"
            );


        // Error
        const sizeError =
            productCard.querySelector(
                ".size-error"
            );


        // =========================
        // SIZE CHECK
        // =========================

        if (!selectedSize) {

            if (sizeError) {

                sizeError.style.display =
                    "block";

            }

            return;

        }


        if (sizeError) {

            sizeError.style.display =
                "none";

        }


        // =========================
        // PRODUCT INFORMATION
        // =========================

        const productName =
            productCard
                .querySelector("h3")
                .textContent
                .trim();


        const productImage =
            productCard
                .querySelector("img")
                .src;


        const productPrice =
            productCard
                .querySelector(".price span")
                .textContent
                .trim();


        const priceNumber =
            parseInt(
                productPrice.replace(
                    /[^\d]/g,
                    ""
                )
            );


        const size =
            selectedSize.dataset.size;


        // =========================
        // CHECK EXISTING PRODUCT
        // =========================

        const existingProduct =
            cart.find(function (item) {

                return (
                    item.name === productName &&
                    item.size === size
                );

            });


        // =========================
        // ADD PRODUCT (never more than the stock we have)
        // =========================

        const maxQty =
            Number(selectedSize.dataset.stock) || null;

        if (existingProduct) {

            const limit = existingProduct.maxQty || maxQty;

            if (limit && existingProduct.quantity + 1 > limit) {

                alert("Sorry, only " + limit + " available in size " + size + ".");

                return;

            }

            existingProduct.quantity++;

            existingProduct.maxQty = limit;

        } else {

            cart.push({

                id:
                    productCard.dataset.id,

                name:
                    productName,

                image:
                    productImage,

                price:
                    priceNumber,

                size:
                    size,

                maxQty:
                    maxQty,

                quantity:
                    1

            });

        }


        // =========================
        // UPDATE CART
        // =========================

        updateCart();


        // =========================
        // OPEN CART
        // =========================

        openCart();


        // =========================
        // BUTTON FEEDBACK
        // =========================

        const originalText =
            button.innerHTML;


        button.innerHTML =
            '<i class="fa-solid fa-check"></i> ADDED';


        button.style.background =
            "#27ae60";


        setTimeout(function () {

            button.innerHTML =
                originalText;

            button.style.background =
                "#222";

        }, 1000);

    }
);







// ============================================================================
// CART DRAWER
// ============================================================================

// Cart elements

const cartDrawer =
    document.querySelector(".cart-drawer");

const cartOverlay =
    document.querySelector(".cart-overlay");

const cartClose =
    document.querySelector(".cart-close");


const cartIcon =
    document.querySelector(
        '.nav-icons a[href="#cart"]'
    );


const cartItems =
    document.querySelector(".cart-items");


const cartItemTotal =
    document.querySelector(".cart-item-total");


const cartTotalPrice =
    document.querySelector(".cart-total-price");


const continueShopping =
    document.querySelector(".continue-shopping");


const cartCount =
    document.querySelector(".cart-count");


// Actual cart array

let cart = JSON.parse(
    localStorage.getItem("cart")
) || [];



// =========================
// OPEN CART
// =========================

function openCart() {

    // Cart already open হলে
    if (
        cartDrawer.classList.contains("active")
    ) {

        return;

    }


    // Open cart
    cartDrawer.classList.add("active");

    cartOverlay.classList.add("active");


    // Add history only if not already #cart
    if (
        location.hash !== "#cart"
    ) {

        history.pushState(
            { cartOpen: true },
            "",
            "#cart"
        );

    }

}



// =========================
// CART ICON CLICK
// =========================

cartIcon.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        openCart();

    }
);



// =========================
// CLOSE CART
// =========================

function closeCart(fromBack = false) {

    // Close cart
    cartDrawer.classList.remove("active");

    cartOverlay.classList.remove("active");


    // যদি Browser Back থেকে close না হয়
    if (
        !fromBack &&
        location.hash === "#cart"
    ) {

        history.back();

    }

}



// =========================
// CLOSE BUTTON
// =========================

cartClose.addEventListener(
    "click",
    function () {

        closeCart();

    }
);



// =========================
// OVERLAY CLICK
// =========================

cartOverlay.addEventListener(
    "click",
    function () {

        closeCart();

    }
);



// =========================
// CONTINUE SHOPPING
// =========================

if (continueShopping) {

    continueShopping.addEventListener(
        "click",
        function () {

            closeCart();

        }
    );

}

// =========================
// UPDATE CART
// =========================

function updateCart() {

    // Save cart to localStorage
    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );

    cartItems.innerHTML = "";



    // =========================
    // EMPTY CART
    // =========================

    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <div class="empty-cart-icon">

                    <i class="fa-solid fa-cart-shopping"></i>

                </div>


                <h3>
                    Your Cart is Empty
                </h3>


                <p>
                    Looks like you haven't added
                    anything to your cart yet.
                </p>


                <button class="continue-shopping">

                    CONTINUE SHOPPING

                </button>

            </div>

        `;



        // Dynamically created button

        const newContinueButton =
            cartItems.querySelector(
                ".continue-shopping"
            );


        if (newContinueButton) {

            newContinueButton.addEventListener(
                "click",
                function () {

                    closeCart();

                }
            );

        }



        // Update counts

        cartCount.textContent =
            "0";


        cartItemTotal.textContent =
            "0";


        cartTotalPrice.textContent =
            "৳0";


        return;

    }



    // =========================
    // CREATE CART PRODUCTS
    // =========================

    cart.forEach(function (item, index) {

        const cartProduct =
            document.createElement("div");


        cartProduct.className =
            "cart-product";


        cartProduct.innerHTML = `

            <div class="cart-product-image">

                <img
                    src="${item.image}"
                    alt="${item.name}"
                >

            </div>


            <div class="cart-product-info">

                <h3>
                    ${item.name}
                </h3>


                <p class="cart-product-size">

                    Size:

                    <strong>
                        ${item.size}
                    </strong>

                </p>


                <div class="cart-product-bottom">

                    <strong>

                        ৳${item.price.toLocaleString()}

                    </strong>


                    <div class="quantity-box">

                        <button
                            class="quantity-minus"
                            data-index="${index}"
                        >

                            −

                        </button>


                        <span>

                            ${item.quantity}

                        </span>


                        <button
                            class="quantity-plus"
                            data-index="${index}"
                        >

                            +

                        </button>

                    </div>

                </div>

            </div>


            <button
                class="remove-cart"
                data-index="${index}"
            >

                <i class="fa-solid fa-trash"></i>

            </button>

        `;


        cartItems.appendChild(
            cartProduct
        );

    });



    // =========================
    // QUANTITY MINUS
    // =========================

    const minusButtons =
        document.querySelectorAll(
            ".quantity-minus"
        );


    minusButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const index =
                    Number(
                        button.dataset.index
                    );


                if (
                    cart[index].quantity > 1
                ) {

                    cart[index].quantity--;

                } else {

                    cart.splice(
                        index,
                        1
                    );

                }


                updateCart();

            }
        );

    });



    // =========================
    // QUANTITY PLUS
    // =========================

    const plusButtons =
        document.querySelectorAll(
            ".quantity-plus"
        );


    plusButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const index =
                    Number(
                        button.dataset.index
                    );


                if (
                    cart[index].maxQty &&
                    cart[index].quantity >= cart[index].maxQty
                ) {

                    alert(
                        "Sorry, only " +
                        cart[index].maxQty +
                        " available in this size."
                    );

                    return;

                }

                cart[index].quantity++;


                updateCart();

            }
        );

    });



    // =========================
    // REMOVE PRODUCT
    // =========================

    const removeButtons =
        document.querySelectorAll(
            ".remove-cart"
        );


    removeButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const index =
                    Number(
                        button.dataset.index
                    );


                cart.splice(
                    index,
                    1
                );


                updateCart();

            }
        );

    });



    // =========================
    // CALCULATE TOTAL
    // =========================

    let totalItems = 0;

    let totalPrice = 0;


    cart.forEach(function (item) {

        totalItems +=
            item.quantity;


        totalPrice +=
            item.price *
            item.quantity;

    });



    // =========================
    // UPDATE NAVBAR COUNT
    // =========================

    cartCount.textContent =
        totalItems;



    // =========================
    // UPDATE CART HEADER
    // =========================

    cartItemTotal.textContent =
        totalItems;



    // =========================
    // UPDATE TOTAL PRICE
    // =========================

    cartTotalPrice.textContent =
        "৳" +
        totalPrice.toLocaleString();

}



// ============================================================================
// CHECKOUT SYSTEM
// ============================================================================

const checkoutBtn =
    document.querySelector(".checkout-btn");


const checkoutModal =
    document.querySelector(".checkout-modal");


const checkoutOverlay =
    document.querySelector(".checkout-overlay");


const checkoutClose =
    document.querySelector(".checkout-close");


const checkoutProductList =
    document.querySelector(".checkout-product-list");


const checkoutTotalItems =
    document.querySelector(".checkout-total-items");


const checkoutTotalPrice =
    document.querySelector(".checkout-total-price");


const orderForm =
    document.querySelector(".order-form");



// =========================
// OPEN CHECKOUT
// =========================

checkoutBtn.addEventListener(
    "click",
    function () {

        // Cart empty check

        if (cart.length === 0) {

            alert(
                "Your cart is empty!"
            );

            return;

        }



        // Update products

        updateCheckout();



        // Close cart manually

        cartDrawer.classList.remove(
            "active"
        );


        cartOverlay.classList.remove(
            "active"
        );



        // Open checkout

        checkoutModal.classList.add(
            "active"
        );


        checkoutOverlay.classList.add(
            "active"
        );

        // Add checkout to browser history

        history.pushState(
            { checkoutOpen: true },
            "",
            "#checkout"
        );



        // Form show

        orderForm.style.display =
            "block";

    }
);



// =========================
// CLOSE CHECKOUT
// =========================

function closeCheckout(fromBack = false) {

    // Close checkout

    checkoutModal.classList.remove(
        "active"
    );

    checkoutOverlay.classList.remove(
        "active"
    );


    // Normal close হলে
    // browser history থেকে checkout remove হবে

    if (
        !fromBack &&
        location.hash === "#checkout"
    ) {

        history.back();

    }

}



// =========================
// CHECKOUT CLOSE BUTTON
// =========================

checkoutClose.addEventListener(
    "click",
    closeCheckout
);



// =========================
// CHECKOUT OVERLAY CLICK
// =========================

checkoutOverlay.addEventListener(
    "click",
    closeCheckout
);



// =========================
// UPDATE CHECKOUT
// =========================

function updateCheckout() {

    checkoutProductList.innerHTML =
        "";


    let totalItems = 0;

    let totalPrice = 0;



    cart.forEach(function (item) {

        const itemTotal =
            item.price *
            item.quantity;


        totalItems +=
            item.quantity;


        totalPrice +=
            itemTotal;



        const checkoutProduct =
            document.createElement("div");


        checkoutProduct.className =
            "checkout-product";


        checkoutProduct.innerHTML = `

            <div class="checkout-product-image">

                <img
                    src="${item.image}"
                    alt="${item.name}"
                >

            </div>


            <div class="checkout-product-info">

                <h4>
                    ${item.name}
                </h4>


                <p>

                    Size:

                    <strong>
                        ${item.size}
                    </strong>

                    &nbsp; | &nbsp;

                    Qty:

                    <strong>
                        ${item.quantity}
                    </strong>

                </p>

            </div>


            <div class="checkout-product-price">

                <strong>

                    ৳${itemTotal.toLocaleString()}

                </strong>


                <span>

                    ৳${item.price.toLocaleString()}
                    ×
                    ${item.quantity}

                </span>

            </div>

        `;


        checkoutProductList.appendChild(
            checkoutProduct
        );

    });



    // Total items

    checkoutTotalItems.textContent =
        totalItems;



    // Total price

    checkoutTotalPrice.textContent =
        "৳" +
        totalPrice.toLocaleString();

}



// ============================================================================
// SUCCESS POPUP
// ============================================================================

const successOverlay =
    document.querySelector(".success-overlay");


const successClose =
    document.querySelector(".success-close");


const successShopping =
    document.querySelector(".success-shopping");



// =========================
// OPEN SUCCESS POPUP
// =========================

function openSuccessPopup() {

    successOverlay.classList.add(
        "active"
    );

}



// =========================
// CLOSE SUCCESS POPUP
// =========================

function closeSuccessPopup() {

    successOverlay.classList.remove(
        "active"
    );

}



// =========================
// SUCCESS CLOSE BUTTON
// =========================

successClose.addEventListener(
    "click",
    closeSuccessPopup
);



// =========================
// SUCCESS SHOPPING BUTTON
// =========================

successShopping.addEventListener(
    "click",
    closeSuccessPopup
);



// =========================
// SUCCESS OVERLAY CLICK
// =========================

successOverlay.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            successOverlay
        ) {

            closeSuccessPopup();

        }

    }
);



// =========================
// NAME ERROR CLEAR
// =========================

const customerNameInput =
    document.querySelector("#customer-name");

const nameError =
    document.querySelector("#name-error");


customerNameInput.addEventListener(
    "input",
    function () {

        if (this.value.trim() !== "") {

            nameError.textContent = "";

        }

    }
);


// =========================
// PHONE ERROR CLEAR
// =========================

const customerPhoneInput =
    document.querySelector("#customer-phone");

const phoneError =
    document.querySelector("#phone-error");

customerPhoneInput.addEventListener(
    "input",
    function () {

        const phone =
            this.value.trim();

        if (/^01[3-9]\d{8}$/.test(phone)) {

            phoneError.textContent = "";

        }

    }
);


// =========================
// ADDRESS ERROR CLEAR
// =========================

const customerAddressInput =
    document.querySelector("#customer-address");

const addressError =
    document.querySelector("#address-error");

customerAddressInput.addEventListener(
    "input",
    function () {

        if (this.value.trim() !== "") {

            addressError.textContent = "";

        }

    }
);



// ============================================================================
// ORDER FORM SUBMIT
// ============================================================================

orderForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();
        const submitButton =
            orderForm.querySelector(
                'button[type="submit"]'
            );



        const customerName =
            document
                .querySelector(
                    "#customer-name"
                )
                .value
                .trim();



        const customerPhone =
            document
                .querySelector(
                    "#customer-phone"
                )
                .value
                .trim();



        const customerAddress =
            document
                .querySelector(
                    "#customer-address"
                )
                .value
                .trim();



        // =========================
        // NAME VALIDATION
        // =========================

        if (customerName === "") {

            const nameError =
                document.querySelector("#name-error");

            nameError.textContent =
                "Please enter your name.";

            return;

        }



        // =========================
        // PHONE VALIDATION
        // =========================

        if (customerPhone === "") {

            const phoneError =
                document.querySelector("#phone-error");

            phoneError.textContent =
                "Please enter your phone number.";

            phoneError.style.display =
                "block";

            return;

        }



        // =========================
        // BANGLADESH PHONE NUMBER VALIDATION
        // =========================

        const phonePattern = /^01[3-9]\d{8}$/;

        if (!phonePattern.test(customerPhone)) {

            const phoneError =
                document.querySelector("#phone-error");

            phoneError.textContent =
                "Please enter a valid Bangladesh phone number.";

            phoneError.style.display =
                "block";

            return;
        }



        // =========================
        // ADDRESS VALIDATION
        // =========================

        if (customerAddress === "") {

            const addressError =
                document.querySelector("#address-error");

            addressError.textContent =
                "Please enter your delivery address.";

            addressError.style.display =
                "block";

            return;
        }



        // =========================
        // BANGLADESH PHONE PATTERN
        // =========================

        if (
            !phonePattern.test(
                customerPhone
            )
        ) {

            const phoneError =
                document.querySelector("#phone-error");

            phoneError.textContent =
                "Please enter a valid Bangladesh phone number.";

            phoneError.style.display =
                "block";

            return;

        }



        // =========================
        // CART EMPTY CHECK
        // =========================

        if (
            cart.length === 0
        ) {

            alert(
                "Your cart is empty."
            );

            return;

        }


        // =========================
        // DISABLE SUBMIT BUTTON
        // =========================

        submitButton.disabled = true;

        submitButton.textContent =
            "PROCESSING...";



        // =========================
        // CALCULATE TOTAL
        // =========================

        let totalItems = 0;

        let totalPrice = 0;



        cart.forEach(function (item) {

            totalItems +=
                item.quantity;


            totalPrice +=
                item.price *
                item.quantity;

        });



        // =========================
        // ORDER DATA
        // =========================

        const orderData = {

            customerName:
                customerName,

            customerPhone:
                customerPhone,

            customerAddress:
                customerAddress,

            products:
                cart.map(function (item) {

                    return {

                        id:
                            item.id || "",

                        name:
                            item.name,

                        size:
                            item.size,

                        price:
                            item.price,

                        quantity:
                            item.quantity

                    };

                }),

            totalItems:
                totalItems,

            totalPrice:
                totalPrice,

            status:
                "Pending",

            createdAt:
                serverTimestamp()

        };



        // =========================
        // SEND ORDER TO FIREBASE
        // =========================

        try {

            // Items saved before stock tracking existed have no id - find it by name
            const stockItems =
                cart.map(function (item) {

                    const match =
                        item.id
                            ? null
                            : allProducts.find(function (p) {
                                return p.name === item.name;
                            });

                    return {
                        id: item.id || (match ? match.id : ""),
                        name: item.name,
                        size: item.size,
                        quantity: item.quantity
                    };

                });

            orderData.products.forEach(function (p, i) {
                p.id = stockItems[i].id;
            });

            const docRef =
                await createOrderWithStock(
                    orderData,
                    stockItems
                );



            console.log(
                "Order ID:",
                docRef.id
            );



            // =========================
            // CREATE ORDER NUMBER
            // =========================

            const orderNumber =
                "GC-" +
                new Date()
                    .toISOString()
                    .slice(0, 10)
                    .replace(/-/g, "") +
                "-" +
                docRef.id
                    .slice(0, 3)
                    .toUpperCase();



            document.querySelector(
                "#success-order-id"
            ).textContent =
                orderNumber;



            // =========================
            // RESET FORM
            // =========================

            orderForm.reset();



            // =========================
            // CLEAR CART
            // =========================

            cart = [];


            updateCart();



            // =========================
            // CLOSE CHECKOUT
            // =========================

            closeCheckout();



            // =========================
            // OPEN SUCCESS POPUP
            // =========================

            openSuccessPopup();


            // Reset submit button

            submitButton.disabled = false;

            submitButton.textContent =
                "PLACE ORDER";



        } catch (error) {

            console.error(
                "Order Error:",
                error
            );

            if (error.code === "out-of-stock") {

                alert(
                    error.message +
                    "\nPlease update your cart and try again."
                );

                // Refresh what is on sale + sizes
                initStore();

            } else {

                alert(
                    "Something went wrong. Please try again."
                );

            }

            // আবার order button চালু করো
            submitButton.disabled = false;

            submitButton.textContent =
                "PLACE ORDER";

        }

    }
);



// ============================================================================
// PHONE / BROWSER BACK BUTTON
// ============================================================================

window.addEventListener(
    "popstate",
    function () {

        // Close checkout if open
        if (
            checkoutModal.classList.contains(
                "active"
            )
        ) {

            closeCheckout(true);

        }


        // Close cart if open
        if (
            cartDrawer.classList.contains(
                "active"
            )
        ) {

            closeCart(true);

        }

    }
);









// 3 dot menu for mobile


const menuBtn = document.querySelector(".menu-btn");
const mobileMenu = document.querySelector(".mobile-menu");

menuBtn.addEventListener("click", function () {
    if (mobileMenu.style.display === "block") {
        mobileMenu.style.display = "none";
    } else {
        mobileMenu.style.display = "block";
    }
});

document.addEventListener("click", function (event) {

    if (
        !mobileMenu.contains(event.target) &&
        !menuBtn.contains(event.target)
    ) {
        mobileMenu.style.display = "none";
    }

});


// Load saved cart when page opens

updateCart();