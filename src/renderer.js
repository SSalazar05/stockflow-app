const productForm = document.getElementById('product-form');
const prodName = document.getElementById('prod-name');
const prodStock = document.getElementById('prod-stock');
const prodPrice = document.getElementById('prod-price');
const productList = document.getElementById('product-list');
const dispatchList = document.getElementById('dispatch-list');
const searchDispatch = document.getElementById('search-dispatch');
const cleanPeriod = document.getElementById('clean-period');
const cleanBtn = document.getElementById('clean-btn');

async function loadInventory() {
    try {
        productList.innerHTML = '';
        const products = await window.inventoryAPI.getProducts();

        if (!products || products.length === 0) {
            productList.innerHTML = `<tr><td colspan="4" class="empty">No hay productos registrados.</td></tr>`;
        } else {
            products.forEach(prod => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${prod.name}</td>
                    <td><span class="badge ${prod.stock < 5 ? 'low' : ''}">${prod.stock}</span></td>
                    <td>$${Number(prod.price).toFixed(2)}</td>
                    <td class="action-cell">
                        <button class="dispatch-btn" data-id="${prod.id}">Despachar</button>
                        <button class="delete-btn" data-id="${prod.id}">🗑️</button>
                    </td>
                `;

                const actionCell = tr.querySelector('.action-cell');
                const dispatchBtn = tr.querySelector('.dispatch-btn');
                const deleteBtn = tr.querySelector('.delete-btn');

                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`¿Estás seguro de eliminar el producto "${prod.name}"?`)) {
                        try {
                            deleteBtn.disabled = true;
                            await window.inventoryAPI.deleteProduct(prod.id);
                            await loadAllData();
                        } catch (err) {
                            alert('Error al eliminar: ' + err.message);
                            deleteBtn.disabled = false;
                        }
                    }
                });

                dispatchBtn.addEventListener('click', () => {
                    actionCell.innerHTML = `
                        <div class="dispatch-inline">
                            <input type="number" class="qty-input" placeholder="Cant" min="1" max="${prod.stock}" style="width: 50px;">
                            <input type="text" class="dest-input" placeholder="Destino" style="width: 80px;">
                            <button class="confirm-btn">OK</button>
                            <button class="cancel-btn">X</button>
                        </div>
                    `;

                    const qtyInput = actionCell.querySelector('.qty-input');
                    const destInput = actionCell.querySelector('.dest-input');
                    const confirmBtn = actionCell.querySelector('.confirm-btn');
                    const cancelBtn = actionCell.querySelector('.cancel-btn');

                    qtyInput.focus();

                    confirmBtn.addEventListener('click', async () => {
                        const quantity = parseInt(qtyInput.value, 10);
                        const destination = destInput.value.trim();

                        if (isNaN(quantity) || quantity <= 0 || quantity > prod.stock) {
                            alert(`Cantidad inválida. Stock disponible: ${prod.stock}`);
                            return;
                        }

                        if (!destination) {
                            alert('Por favor ingresa un destino.');
                            return;
                        }

                        try {
                            confirmBtn.disabled = true;
                            await window.inventoryAPI.dispatchProduct({ 
                                productId: prod.id, 
                                quantity, 
                                destination 
                            });
                            await loadAllData();
                        } catch (err) {
                            alert('Error: ' + err.message);
                            confirmBtn.disabled = false;
                        }
                    });

                    cancelBtn.addEventListener('click', () => {
                        loadAllData();
                    });
                });

                productList.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar inventario:', error);
    }
}

async function loadDispatches(filter = '') {
    try {
        dispatchList.innerHTML = '';
        const dispatches = await window.inventoryAPI.getDispatches(filter);

        if (!dispatches || dispatches.length === 0) {
            dispatchList.innerHTML = `<tr><td colspan="4" class="empty">No hay despachos registrados.</td></tr>`;
        } else {
            dispatches.forEach(disp => {
                const tr = document.createElement('tr');
                const fecha = new Date(disp.dispatched_at).toLocaleString();
                tr.innerHTML = `
                    <td>${disp.product_name}</td>
                    <td><strong>${disp.quantity}</strong></td>
                    <td>${disp.destination}</td>
                    <td><small style="color: #606266;">${fecha}</small></td>
                `;
                dispatchList.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar despachos:', error);
    }
}

async function loadAllData() {
    await loadInventory();
    await loadDispatches(searchDispatch.value.trim());
}

searchDispatch.addEventListener('input', (e) => {
    loadDispatches(e.target.value.trim());
});

cleanBtn.addEventListener('click', async () => {
    const period = cleanPeriod.value;
    if (!period) {
        alert('Por favor selecciona un período de tiempo para limpiar.');
        return;
    }

    let textPeriod = '';
    if (period === '1week') textPeriod = '1 semana';
    if (period === '3months') textPeriod = '3 meses';
    if (period === '6months') textPeriod = '6 meses';

    if (confirm(`¿Estás seguro de eliminar todo el historial con una antigüedad mayor a ${textPeriod}?`)) {
        try {
            cleanBtn.disabled = true;
            const deletedCount = await window.inventoryAPI.cleanDispatches(period);
            alert(`Se han eliminado ${deletedCount} registros antiguos del historial.`);
            cleanPeriod.value = '';
            await loadAllData();
        } catch (err) {
            alert('Error al limpiar el historial: ' + err.message);
        } finally {
            cleanBtn.disabled = false;
        }
    }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = prodName.value.trim();
    const stock = parseInt(prodStock.value, 10);
    const price = parseFloat(prodPrice.value);

    if (!name || isNaN(stock) || isNaN(price)) return;

    try {
        await window.inventoryAPI.addProduct({ name, stock, price });
        prodName.value = '';
        prodStock.value = '';
        prodPrice.value = '';
        await loadAllData();
        prodName.focus();
    } catch (error) {
        console.error('Error al agregar producto:', error);
    }
});

loadAllData();