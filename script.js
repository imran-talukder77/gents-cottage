import { products } from "./products.js";


// ============================================================================
// RENDER PRODUCTS
// ============================================================================

const productContainer =
    document.querySelector(".product-container");


function renderProducts() {

    if (!productContainer) {
        return;
    }


    productContainer.innerHTML = "";


    products.forEach(function (product) {

        const productCard =
            document.createElement("div");

        productCard.className =
            "product-card";


        productCard.dataset.category =
            product.category;


        productCard.innerHTML = `

            <div class="product-image">

                <a href="product-details.html?id=${product.id}">

                    <img
                        src="${product.image}"
                        alt="${product.name}"
                    >

                </a>

                <span class="product-badge">
                    ${product.badge}
                </span>

            </div>


            <div class="product-info">

                <h3>${product.name}</h3>


                <div class="price">

                    <span>৳${product.price}</span>

                    <del>৳${product.oldPrice}</del>

                </div>


                <div class="product-sizes">

                    <button class="size-btn" data-size="M">
                        M
                    </button>

                    <button class="size-btn" data-size="L">
                        L
                    </button>

                    <button class="size-btn" data-size="XL">
                        XL
                    </button>

                    <button class="size-btn" data-size="XXL">
                        XXL
                    </button>

                </div>


                <p class="size-error">
                    Please select a size first!
                </p>


                <button class="add-cart">

                    <i class="fa-solid fa-cart-shopping"></i>

                    ADD TO CART

                </button>

            </div>

        `;


        productContainer.appendChild(productCard);

    });

}


renderProducts();




// ============================================================================
// PRODUCT FILTER + SIZE + ADD TO CART
// ============================================================================


// =========================
// PRODUCT CATEGORY FILTER
// =========================

const filterButtons =
    document.querySelectorAll(".filter-btn");


filterButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        // =========================================
        // REMOVE ACTIVE
        // =========================================

        filterButtons.forEach(function (btn) {

            btn.classList.remove("active");

        });


        // =========================================
        // ADD ACTIVE
        // =========================================

        button.classList.add("active");


        // =========================================
        // SELECTED CATEGORY
        // =========================================

        const selectedCategory =
            button.dataset.filter;


        // =========================================
        // ALL PRODUCT CARDS
        // =========================================

        const productCards =
            document.querySelectorAll(".product-card");


        // =========================================
        // FILTER PRODUCTS
        // =========================================

        productCards.forEach(function (product) {

            const productCategory =
                product.dataset.category;


            if (
                selectedCategory === "all" ||
                selectedCategory === productCategory
            ) {

                product.style.display =
                    "block";

            } else {

                product.style.display =
                    "none";

            }

        });


        // =========================================
        // FIND FIRST VISIBLE PRODUCT
        // =========================================

        const firstVisibleProduct =
            Array.from(productCards).find(function (product) {

                return product.style.display !== "none";

            });


        // =========================================
        // SCROLL TO FIRST PRODUCT
        // =========================================

        if (firstVisibleProduct) {

            const header =
                document.querySelector("header");

            const productFilter =
                document.querySelector(".product-filter");


            const headerHeight =
                header
                    ? header.offsetHeight
                    : 0;


            const filterHeight =
                productFilter
                    ? productFilter.offsetHeight
                    : 0;


            const extraSpace = 15;


            const targetPosition =
                firstVisibleProduct.getBoundingClientRect().top +
                window.scrollY -
                headerHeight -
                filterHeight -
                extraSpace;


            window.scrollTo({

                top: targetPosition,

                behavior: "smooth"

            });

        }

    });

});



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
        // ADD PRODUCT
        // =========================

        if (existingProduct) {

            existingProduct.quantity++;

        } else {

            cart.push({

                name:
                    productName,

                image:
                    productImage,

                price:
                    priceNumber,

                size:
                    size,

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
                window.serverTimestamp()

        };



        // =========================
        // SEND ORDER TO FIREBASE
        // =========================

        try {

            const docRef =
                await window.addDoc(

                    window.collection(
                        window.db,
                        "orders"
                    ),

                    orderData

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

            alert(
                "Something went wrong. Please try again."
            );

            // আবার order button চালু করো
            submitButton.disabled = false;

            submitButton.textContent =
                "PLACE ORDER";

        }

    }
);



// ============================================================================
// CATEGORY SHOP NOW BUTTON
// ============================================================================

const categoryShopButtons =
    document.querySelectorAll(
        ".category-shop"
    );


categoryShopButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                const category =
                    this.dataset.category;



                // Find matching filter button

                const filterButton =
                    document.querySelector(
                        `.filter-btn[data-filter="${category}"]`
                    );



                if (filterButton) {

                    // Click filter button

                    filterButton.click();

                }



                // Scroll to products

                document
                    .querySelector("#products")
                    .scrollIntoView({
                        behavior: "smooth"
                    });

            }
        );

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