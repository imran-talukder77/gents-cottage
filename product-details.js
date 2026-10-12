import {
    db, serverTimestamp, createOrderWithStock, stockOf,
    getProducts, getProductById, getSettings, applySettingsToPage,
    productCardHTML, escapeHTML, formatPrice, discountPercent
} from "./store.js";


// ============================================================================
// LOAD PRODUCT FROM URL (Firestore, with built-in fallback)
// ============================================================================

const urlParams =
    new URLSearchParams(window.location.search);

const productId =
    urlParams.get("id");

const currentProduct =
    await getProductById(productId);

const products =
    await getProducts();

getSettings().then(applySettingsToPage);


if (currentProduct && !currentProduct.visible) {

    document.querySelector(".product-details").innerHTML =
        `<div style="text-align:center;padding:90px 20px"><h2>${escapeHTML(currentProduct.name)}</h2><p style="margin:12px 0 24px;color:#666">This product is currently sold out or unavailable.</p><a href="index.html#products" style="background:#111;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none">Continue shopping</a></div>`;

} else if (currentProduct) {

    document.title = currentProduct.name + " | Gents Cottage";

    // Image gallery
    const imageBox = document.querySelector(".details-image");

    const gallery = currentProduct.images.length
        ? currentProduct.images
        : [currentProduct.image];

    imageBox.innerHTML =
        `<img src="${escapeHTML(gallery[0])}" alt="${escapeHTML(currentProduct.name)}">` +
        (gallery.length > 1
            ? `<div class="details-thumbs">${gallery.map(function (src, i) {
                return `<button type="button" class="${i === 0 ? "active" : ""}"><img src="${escapeHTML(src)}" alt=""></button>`;
            }).join("")}</div>`
            : "");

    imageBox.addEventListener("click", function (event) {
        const thumb = event.target.closest(".details-thumbs button");
        if (!thumb) return;
        imageBox.querySelector(":scope > img").src = thumb.querySelector("img").src;
        imageBox.querySelectorAll(".details-thumbs button").forEach(function (b) { b.classList.remove("active"); });
        thumb.classList.add("active");
    });

    document.querySelector(".details-category").textContent =
        currentProduct.category.toUpperCase();

    document.querySelector(".details-info h1").textContent =
        currentProduct.name;

    document.querySelector(".details-price span").textContent =
        formatPrice(currentProduct.price);

    const oldPriceEl = document.querySelector(".details-price del");

    oldPriceEl.textContent = currentProduct.oldPrice ? formatPrice(currentProduct.oldPrice) : "";
    oldPriceEl.style.display = currentProduct.oldPrice ? "" : "none";

    document.querySelector(".details-description").textContent =
        currentProduct.description;

    // Sizes
    document.querySelector(".details-size .size-options").innerHTML =
        currentProduct.sizes.map(function (size) {
            const left = stockOf(currentProduct, size);
            return left > 0
                ? `<button type="button" data-stock="${left === Infinity ? "" : left}">${escapeHTML(size)}</button>`
                : `<button type="button" class="size-out" disabled title="Out of stock">${escapeHTML(size)}</button>`;
        }).join("") +
        `<p class="stock-note" style="width:100%;margin-top:8px;font-size:13px;color:#b45309;min-height:18px"></p>`;

} else {

    document.querySelector(".product-details").innerHTML =
        `<div style="text-align:center;padding:90px 20px"><h2>Product not found</h2><p style="margin:12px 0 24px;color:#666">This product may have been removed.</p><a href="index.html#products" style="background:#111;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none">Back to shop</a></div>`;

}



// ============================================================================
// RELATED PRODUCTS
// ============================================================================

const relatedProductsContainer =
    document.querySelector(
        ".related-products-container"
    );


if (
    currentProduct &&
    relatedProductsContainer
) {

    const relatedProducts =
        products
            .filter(function (product) {
                return (
                    product.category === currentProduct.category &&
                    product.id !== currentProduct.id
                );
            })
            .slice(0, 4);

    relatedProductsContainer.innerHTML =
        relatedProducts.map(productCardHTML).join("");

    if (!relatedProducts.length) {
        relatedProductsContainer.closest("section").style.display = "none";
    }

}



// ============================================================================
// RELATED PRODUCTS - SIZE & ADD TO CART
// ============================================================================


if (relatedProductsContainer) {

    relatedProductsContainer.addEventListener(
        "click",
        function (event) {


            // =========================
            // SIZE SELECT
            // =========================

            const sizeButton =
                event.target.closest(
                    ".size-btn"
                );


            if (sizeButton) {

                const productCard =
                    sizeButton.closest(
                        ".product-card"
                    );


                const allSizeButtons =
                    productCard.querySelectorAll(
                        ".size-btn"
                    );


                allSizeButtons.forEach(
                    function (button) {

                        button.classList.remove(
                            "active"
                        );

                    }
                );


                sizeButton.classList.add(
                    "active"
                );


                const sizeError =
                    productCard.querySelector(
                        ".size-error"
                    );


                if (sizeError) {

                    sizeError.classList.remove(
                        "show"
                    );

                }


                return;

            }


            // =========================
            // ADD TO CART
            // =========================

            const addCartButton =
                event.target.closest(
                    ".add-cart"
                );


            if (addCartButton) {

                const productCard =
                    addCartButton.closest(
                        ".product-card"
                    );


                const selectedSizeButton =
                    productCard.querySelector(
                        ".size-btn.active"
                    );


                const sizeError =
                    productCard.querySelector(
                        ".size-error"
                    );


                // SIZE CHECK

                if (!selectedSizeButton) {

                    if (sizeError) {

                        sizeError.classList.add(
                            "show"
                        );

                    }

                    return;

                }


                const selectedSize =
                    selectedSizeButton.dataset.size;


                // FIND PRODUCT ID

                const productLink =
                    productCard.querySelector(
                        ".product-image a"
                    );


                const productUrl =
                    new URL(
                        productLink.href
                    );


                const relatedProductId = productUrl.searchParams.get("id");


                // FIND PRODUCT DATA

                const relatedProduct =
                    products.find(
                        function (product) {

                            return (
                                product.id ===
                                relatedProductId
                            );

                        }
                    );


                if (!relatedProduct) {
                    return;
                }


                // CHECK EXISTING PRODUCT

                const existingProduct =
                    cart.find(
                        function (item) {

                            return (

                                item.name ===
                                relatedProduct.name &&

                                item.size ===
                                selectedSize

                            );

                        }
                    );


                // ADD / UPDATE

                const relatedMax =
                    Number(selectedSizeButton.dataset.stock) || null;

                if (
                    existingProduct &&
                    relatedMax &&
                    existingProduct.quantity + 1 > relatedMax
                ) {

                    alert("Sorry, only " + relatedMax + " available in size " + selectedSize + ".");

                    return;

                }

                if (existingProduct) {

                    existingProduct.quantity++;

                    existingProduct.maxQty = relatedMax;

                } else {

                    cart.push({

                        id:
                            relatedProduct.id,

                        maxQty:
                            relatedMax,

                        name:
                            relatedProduct.name,

                        image:
                            relatedProduct.image,

                        price:
                            relatedProduct.price,

                        size:
                            selectedSize,

                        quantity:
                            1

                    });

                }


                // UPDATE CART

                updateCart();


                // OPEN CART

                openCart();


                // BUTTON FEEDBACK


                // BUTTON FEEDBACK

                const originalText =
                    addCartButton.innerHTML;


                addCartButton.innerHTML =
                    '<i class="fa-solid fa-check"></i> ADDED';


                setTimeout(
                    function () {

                        addCartButton.innerHTML =
                            originalText;

                    },
                    1000
                );

            }

        }
    );

}



// ============================================================================
// PRODUCT DETAILS PAGE
// ============================================================================


// =========================
// MOBILE MENU
// =========================

const menuBtn =
    document.querySelector(".menu-btn");

const mobileMenu =
    document.querySelector(".mobile-menu");


if (menuBtn && mobileMenu) {

    menuBtn.addEventListener(
        "click",
        function () {

            if (
                mobileMenu.style.display === "block"
            ) {

                mobileMenu.style.display =
                    "none";

            } else {

                mobileMenu.style.display =
                    "block";

            }

        }
    );


    document.addEventListener(
        "click",
        function (event) {

            if (
                !mobileMenu.contains(event.target) &&
                !menuBtn.contains(event.target)
            ) {

                mobileMenu.style.display =
                    "none";

            }

        }
    );

}



// ============================================================================
// PRODUCT SIZE SELECTION
// ============================================================================

const detailSizeButtons =
    document.querySelectorAll(
        ".details-size .size-options button"
    );


let selectedSize = "";

let selectedStock = null;



detailSizeButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                // Remove active from all sizes

                detailSizeButtons.forEach(
                    function (btn) {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


                // Active selected size

                button.classList.add(
                    "active"
                );


                // Save selected size

                // Save selected size

                selectedSize =
                    button.textContent.trim();

                selectedStock =
                    Number(button.dataset.stock) || null;

                const stockNote =
                    document.querySelector(".stock-note");

                if (stockNote) {

                    stockNote.textContent =
                        selectedStock && selectedStock <= 5
                            ? "Hurry — only " + selectedStock + " left in this size!"
                            : "";

                }

                if (selectedStock && productQuantity > selectedStock) {

                    productQuantity = selectedStock;

                    const qd = document.querySelector(".quantity-box span");

                    if (qd) qd.textContent = productQuantity;

                }


                // Remove size error

                const sizeError =
                    document.querySelector(".size-error");

                if (sizeError) {

                    sizeError.classList.remove("show");

                }

            }
        );

    }
);



// ============================================================================
// PRODUCT QUANTITY
// ============================================================================

const quantityBox =
    document.querySelector(
        ".quantity-box"
    );


let productQuantity = 1;



if (quantityBox) {

    const quantityButtons =
        quantityBox.querySelectorAll(
            "button"
        );

    const quantityDisplay =
        quantityBox.querySelector(
            "span"
        );


    quantityButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const buttonText =
                        button.textContent.trim();


                    // MINUS

                    if (
                        buttonText === "-"
                    ) {

                        if (
                            productQuantity > 1
                        ) {

                            productQuantity--;

                        }

                    }


                    // PLUS

                    if (
                        buttonText === "+"
                    ) {

                        if (selectedStock && productQuantity >= selectedStock) {

                            alert("Sorry, only " + selectedStock + " available in this size.");

                        } else {

                            productQuantity++;

                        }

                    }


                    // Update display

                    quantityDisplay.textContent =
                        productQuantity;

                }
            );

        }
    );

}



// ============================================================================
// CART SYSTEM
// ============================================================================


// =========================
// CART ELEMENTS
// =========================

const cartDrawer =
    document.querySelector(
        ".cart-drawer"
    );


const cartOverlay =
    document.querySelector(
        ".cart-overlay"
    );


const cartClose =
    document.querySelector(
        ".cart-close"
    );


const cartIcon =
    document.querySelector(
        '.nav-icons a[href="#cart"]'
    );


const cartItems =
    document.querySelector(
        ".cart-items"
    );


const cartItemTotal =
    document.querySelector(
        ".cart-item-total"
    );


const cartTotalPrice =
    document.querySelector(
        ".cart-total-price"
    );


const cartCount =
    document.querySelector(
        ".cart-count"
    );



// =========================
// LOAD CART
// =========================

let cart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || [];



// ============================================================================
// OPEN CART
// ============================================================================

function openCart() {

    if (!cartDrawer) {
        return;
    }


    cartDrawer.classList.add(
        "active"
    );


    if (cartOverlay) {

        cartOverlay.classList.add(
            "active"
        );

    }


    // Browser history

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



// ============================================================================
// CLOSE CART
// ============================================================================

function closeCart(
    fromBack = false
) {

    if (cartDrawer) {

        cartDrawer.classList.remove(
            "active"
        );

    }


    if (cartOverlay) {

        cartOverlay.classList.remove(
            "active"
        );

    }


    if (
        !fromBack &&
        location.hash === "#cart"
    ) {

        history.back();

    }

}



// ============================================================================
// CART ICON
// ============================================================================

if (cartIcon) {

    cartIcon.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            openCart();

        }
    );

}



// ============================================================================
// CART CLOSE
// ============================================================================

if (cartClose) {

    cartClose.addEventListener(
        "click",
        function () {

            closeCart();

        }
    );

}



// ============================================================================
// CART OVERLAY
// ============================================================================

if (cartOverlay) {

    cartOverlay.addEventListener(
        "click",
        function () {

            closeCart();

        }
    );

}



// ============================================================================
// ADD PRODUCT TO CART
// ============================================================================

const detailsAddCart =
    document.querySelector(
        ".details-add-cart"
    );



if (detailsAddCart) {

    detailsAddCart.addEventListener(
        "click",
        function () {

            // =========================
            // SIZE CHECK
            // =========================

            if (selectedSize === "") {

                const sizeError =
                    document.querySelector(".size-error");

                if (sizeError) {

                    sizeError.textContent =
                        "Please select a size first!";

                    sizeError.classList.add("show");

                }

                return;
            }


            // =========================
            // PRODUCT INFORMATION
            // =========================

            const productName =
                document
                    .querySelector(
                        ".details-info h1"
                    )
                    .textContent
                    .trim();


            const productImage =
                document
                    .querySelector(
                        ".details-image img"
                    )
                    .src;


            const productPriceText =
                document
                    .querySelector(
                        ".details-price span"
                    )
                    .textContent
                    .trim();


            const productPrice =
                parseInt(
                    productPriceText.replace(
                        /[^\d]/g,
                        ""
                    )
                );



            // =========================
            // CHECK EXISTING PRODUCT
            // =========================

            const existingProduct =
                cart.find(
                    function (item) {

                        return (

                            item.name ===
                            productName &&

                            item.size ===
                            selectedSize

                        );

                    }
                );



            // =========================
            // ADD / UPDATE
            // =========================

            if (
                existingProduct &&
                selectedStock &&
                existingProduct.quantity + productQuantity > selectedStock
            ) {

                alert("Sorry, only " + selectedStock + " available in size " + selectedSize + " (you already have some in your cart).");

                return;

            }

            if (existingProduct) {

                existingProduct.quantity +=
                    productQuantity;

                existingProduct.maxQty = selectedStock;

            } else {

                cart.push({

                    id:
                        currentProduct ? currentProduct.id : "",

                    maxQty:
                        selectedStock,

                    name:
                        productName,

                    image:
                        productImage,

                    price:
                        productPrice,

                    size:
                        selectedSize,

                    quantity:
                        productQuantity

                });

            }



            // =========================
            // SAVE + UPDATE
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
                detailsAddCart.innerHTML;


            detailsAddCart.innerHTML =
                '<i class="fa-solid fa-check"></i> ADDED';


            detailsAddCart.style.background =
                "#27ae60";


            setTimeout(
                function () {

                    detailsAddCart.innerHTML =
                        originalText;


                    detailsAddCart.style.background =
                        "#111827";

                },
                1000
            );

        }
    );

}



// ============================================================================
// UPDATE CART
// ============================================================================

function updateCart() {

    // =========================
    // SAVE CART
    // =========================

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    if (!cartItems) {
        return;
    }


    cartItems.innerHTML = "";



    // =========================
    // EMPTY CART
    // =========================

    if (
        cart.length === 0
    ) {

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


        const continueButton =
            cartItems.querySelector(
                ".continue-shopping"
            );


        if (continueButton) {

            continueButton.addEventListener(
                "click",
                function () {

                    closeCart();

                }
            );

        }


        if (cartCount) {

            cartCount.textContent =
                "0";

        }


        if (cartItemTotal) {

            cartItemTotal.textContent =
                "0";

        }


        if (cartTotalPrice) {

            cartTotalPrice.textContent =
                "৳0";

        }


        return;

    }



    // =========================
    // CREATE CART PRODUCTS
    // =========================

    cart.forEach(
        function (item, index) {

            const cartProduct =
                document.createElement(
                    "div"
                );


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

        }
    );



    // ========================================================================
    // CART QUANTITY MINUS
    // ========================================================================

    const minusButtons =
        document.querySelectorAll(
            ".quantity-minus"
        );


    minusButtons.forEach(
        function (button) {

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

        }
    );



    // ========================================================================
    // CART QUANTITY PLUS
    // ========================================================================

    const plusButtons =
        document.querySelectorAll(
            ".quantity-plus"
        );


    plusButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            button.dataset.index
                        );


                    cart[index].quantity++;


                    updateCart();

                }
            );

        }
    );



    // ========================================================================
    // REMOVE CART PRODUCT
    // ========================================================================

    const removeButtons =
        document.querySelectorAll(
            ".remove-cart"
        );


    removeButtons.forEach(
        function (button) {

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

        }
    );



    // ========================================================================
    // CALCULATE TOTAL
    // ========================================================================

    let totalItems = 0;

    let totalPrice = 0;


    cart.forEach(
        function (item) {

            totalItems +=
                item.quantity;


            totalPrice +=
                item.price *
                item.quantity;

        }
    );



    // =========================
    // NAVBAR COUNT
    // =========================

    if (cartCount) {

        cartCount.textContent =
            totalItems;

    }


    // =========================
    // CART HEADER COUNT
    // =========================

    if (cartItemTotal) {

        cartItemTotal.textContent =
            totalItems;

    }


    // =========================
    // CART TOTAL
    // =========================

    if (cartTotalPrice) {

        cartTotalPrice.textContent =
            "৳" +
            totalPrice.toLocaleString();

    }

}



// ============================================================================
// CHECKOUT SYSTEM
// ============================================================================

const checkoutBtn =
    document.querySelector(
        ".checkout-btn"
    );


const checkoutModal =
    document.querySelector(
        ".checkout-modal"
    );


const checkoutOverlay =
    document.querySelector(
        ".checkout-overlay"
    );


const checkoutClose =
    document.querySelector(
        ".checkout-close"
    );


const checkoutProductList =
    document.querySelector(
        ".checkout-product-list"
    );


const checkoutTotalItems =
    document.querySelector(
        ".checkout-total-items"
    );


const checkoutTotalPrice =
    document.querySelector(
        ".checkout-total-price"
    );


const orderForm =
    document.querySelector(
        ".order-form"
    );



// ============================================================================
// OPEN CHECKOUT
// ============================================================================

if (checkoutBtn) {

    checkoutBtn.addEventListener(
        "click",
        function () {

            // Empty cart

            if (
                cart.length === 0
            ) {

                alert(
                    "Your cart is empty!"
                );

                return;

            }


            // Update checkout

            updateCheckout();


            // Close cart

            if (cartDrawer) {

                cartDrawer.classList.remove(
                    "active"
                );

            }


            if (cartOverlay) {

                cartOverlay.classList.remove(
                    "active"
                );

            }


            // Open checkout

            if (checkoutModal) {

                checkoutModal.classList.add(
                    "active"
                );

            }


            if (checkoutOverlay) {

                checkoutOverlay.classList.add(
                    "active"
                );

            }


            // History

            if (
                location.hash !== "#checkout"
            ) {

                history.pushState(
                    { checkoutOpen: true },
                    "",
                    "#checkout"
                );

            }

        }
    );

}



// ============================================================================
// CLOSE CHECKOUT
// ============================================================================

function closeCheckout(
    fromBack = false
) {

    if (checkoutModal) {

        checkoutModal.classList.remove(
            "active"
        );

    }


    if (checkoutOverlay) {

        checkoutOverlay.classList.remove(
            "active"
        );

    }


    if (
        !fromBack &&
        location.hash === "#checkout"
    ) {

        history.back();

    }

}



// ============================================================================
// CHECKOUT CLOSE BUTTON
// ============================================================================

if (checkoutClose) {

    checkoutClose.addEventListener(
        "click",
        function () {

            closeCheckout();

        }
    );

}



// ============================================================================
// CHECKOUT OVERLAY
// ============================================================================

if (checkoutOverlay) {

    checkoutOverlay.addEventListener(
        "click",
        function () {

            closeCheckout();

        }
    );

}



// ============================================================================
// UPDATE CHECKOUT
// ============================================================================

function updateCheckout() {

    if (!checkoutProductList) {
        return;
    }


    checkoutProductList.innerHTML =
        "";


    let totalItems = 0;

    let totalPrice = 0;


    cart.forEach(
        function (item) {

            const itemTotal =
                item.price *
                item.quantity;


            totalItems +=
                item.quantity;


            totalPrice +=
                itemTotal;


            const checkoutProduct =
                document.createElement(
                    "div"
                );


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

        }
    );



    // =========================
    // TOTAL ITEMS
    // =========================

    if (checkoutTotalItems) {

        checkoutTotalItems.textContent =
            totalItems;

    }


    // =========================
    // TOTAL PRICE
    // =========================

    if (checkoutTotalPrice) {

        checkoutTotalPrice.textContent =
            "৳" +
            totalPrice.toLocaleString();

    }

}



// ============================================================================
// SUCCESS POPUP
// ============================================================================

const successOverlay =
    document.querySelector(
        ".success-overlay"
    );


const successClose =
    document.querySelector(
        ".success-close"
    );


const successShopping =
    document.querySelector(
        ".success-shopping"
    );



// ============================================================================
// OPEN SUCCESS
// ============================================================================

function openSuccessPopup() {

    if (successOverlay) {

        successOverlay.classList.add(
            "active"
        );

    }

}



// ============================================================================
// CLOSE SUCCESS
// ============================================================================

function closeSuccessPopup() {

    if (successOverlay) {

        successOverlay.classList.remove(
            "active"
        );

    }

}



// ============================================================================
// SUCCESS CLOSE
// ============================================================================

if (successClose) {

    successClose.addEventListener(
        "click",
        closeSuccessPopup
    );

}



// ============================================================================
// SUCCESS SHOPPING
// ============================================================================

if (successShopping) {

    successShopping.addEventListener(
        "click",
        function () {

            closeSuccessPopup();

            window.location.href =
                "index.html#products";

        }
    );

}



// ============================================================================
// SUCCESS OVERLAY CLICK
// ============================================================================

if (successOverlay) {

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

}



// ============================================================================
// FORM ELEMENTS
// ============================================================================

const customerNameInput =
    document.querySelector(
        "#customer-name"
    );


const customerPhoneInput =
    document.querySelector(
        "#customer-phone"
    );


const customerAddressInput =
    document.querySelector(
        "#customer-address"
    );


const nameError =
    document.querySelector(
        "#name-error"
    );


const phoneError =
    document.querySelector(
        "#phone-error"
    );


const addressError =
    document.querySelector(
        "#address-error"
    );



// ============================================================================
// CLEAR NAME ERROR
// ============================================================================

if (customerNameInput) {

    customerNameInput.addEventListener(
        "input",
        function () {

            if (
                this.value.trim() !== ""
            ) {

                if (nameError) {

                    nameError.textContent =
                        "";

                }

            }

        }
    );

}



// ============================================================================
// CLEAR PHONE ERROR
// ============================================================================

if (customerPhoneInput) {

    customerPhoneInput.addEventListener(
        "input",
        function () {

            const phone =
                this.value.trim();


            if (
                /^01[3-9]\d{8}$/.test(phone)
            ) {

                if (phoneError) {

                    phoneError.textContent =
                        "";

                }

            }

        }
    );

}



// ============================================================================
// CLEAR ADDRESS ERROR
// ============================================================================

if (customerAddressInput) {

    customerAddressInput.addEventListener(
        "input",
        function () {

            if (
                this.value.trim() !== ""
            ) {

                if (addressError) {

                    addressError.textContent =
                        "";

                }

            }

        }
    );

}



// ============================================================================
// ORDER SUBMIT
// ============================================================================

if (orderForm) {

    orderForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const submitButton =
                orderForm.querySelector(
                    'button[type="submit"]'
                );


            const customerName =
                customerNameInput
                    ? customerNameInput.value.trim()
                    : "";


            const customerPhone =
                customerPhoneInput
                    ? customerPhoneInput.value.trim()
                    : "";


            const customerAddress =
                customerAddressInput
                    ? customerAddressInput.value.trim()
                    : "";



            // =========================
            // NAME VALIDATION
            // =========================

            if (
                customerName === ""
            ) {

                if (nameError) {

                    nameError.textContent =
                        "Please enter your name.";

                }

                return;

            }



            // =========================
            // PHONE VALIDATION
            // =========================

            if (
                customerPhone === ""
            ) {

                if (phoneError) {

                    phoneError.textContent =
                        "Please enter your phone number.";

                }

                return;

            }



            const phonePattern =
                /^01[3-9]\d{8}$/;


            if (
                !phonePattern.test(
                    customerPhone
                )
            ) {

                if (phoneError) {

                    phoneError.textContent =
                        "Please enter a valid Bangladesh phone number.";

                }

                return;

            }



            // =========================
            // ADDRESS VALIDATION
            // =========================

            if (
                customerAddress === ""
            ) {

                if (addressError) {

                    addressError.textContent =
                        "Please enter your delivery address.";

                }

                return;

            }



            // =========================
            // CART CHECK
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
            // BUTTON DISABLE
            // =========================

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "PROCESSING...";

            }



            // =========================
            // CALCULATE TOTAL
            // =========================

            let totalItems = 0;

            let totalPrice = 0;


            cart.forEach(
                function (item) {

                    totalItems +=
                        item.quantity;


                    totalPrice +=
                        item.price *
                        item.quantity;

                }
            );



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
                    cart.map(
                        function (item) {

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

                        }
                    ),

                totalItems:
                    totalItems,

                totalPrice:
                    totalPrice,

                status:
                    "Pending",

                createdAt:
                    serverTimestamp()

            };



            // ====================================================================
            // FIREBASE
            // ====================================================================

            try {

                // Check Firebase

                if (!db) { throw new Error("Firebase is not connected."); }



                // =========================
                // SEND ORDER
                // =========================

                const stockItems =
                    cart.map(function (item) {

                        const match =
                            item.id
                                ? null
                                : products.find(function (p) {
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



                // =========================
                // SHOW ORDER ID
                // =========================

                const successOrderId =
                    document.querySelector(
                        "#success-order-id"
                    );


                if (successOrderId) {

                    successOrderId.textContent =
                        orderNumber;

                }



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
                // OPEN SUCCESS
                // =========================

                openSuccessPopup();



                // =========================
                // RESET BUTTON
                // =========================

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.innerHTML =
                        'PLACE ORDER <i class="fa-solid fa-check"></i>';

                }



            } catch (error) {

                console.error(
                    "Order Error:",
                    error
                );


                alert(
                    error.code === "out-of-stock"
                        ? error.message + "\nPlease update your cart and try again."
                        : "Something went wrong. Please try again."
                );


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.innerHTML =
                        'PLACE ORDER <i class="fa-solid fa-check"></i>';

                }

            }

        }
    );

}



// ============================================================================
// BROWSER BACK BUTTON
// ============================================================================

window.addEventListener(
    "popstate",
    function () {

        // Close checkout

        if (
            checkoutModal &&
            checkoutModal.classList.contains(
                "active"
            )
        ) {

            closeCheckout(true);

        }


        // Close cart

        if (
            cartDrawer &&
            cartDrawer.classList.contains(
                "active"
            )
        ) {

            closeCart(true);

        }

    }
);



// ============================================================================
// LOAD SAVED CART
// ============================================================================

updateCart();