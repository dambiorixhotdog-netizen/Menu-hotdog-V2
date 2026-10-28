import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = 'https://wwizzismcjhphjfmtpcy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x0eBxaXrJ8zuda3n51UGXA_szWkMpSz';
const CLOUDINARY_CLOUD = 'a1fyaupj';
const CLOUDINARY_PRESET = 'menu_hotdog_unsigned';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let allProducts = [];
let allCategories = [];

// ==========================================
// 1. SEGURIDAD Y CARGA INICIAL
// ==========================================
async function initApp() {
  await loadCategoriesForSelect();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  loadData();
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
});

async function loadCategoriesForSelect() {
  try {
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
    allCategories = cats || [];
    
    const selectCat = document.getElementById('prod-cat');
    if (selectCat) {
      selectCat.innerHTML = '<option value="">Selecciona una categoría...</option>' + 
        allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
}

// ==========================================
// 2. SUBIDA A CLOUDINARY
// ==========================================
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { url: data.secure_url, public_id: data.public_id };
}

// ==========================================
// 3. NAVEGACIÓN (Tabs)
// ==========================================
window.showTab = function(tab) {
  const secProducts = document.getElementById('section-products');
  const secCategories = document.getElementById('section-categories');
  const btnProducts = document.getElementById('tab-products');
  const btnCategories = document.getElementById('tab-categories');
  
  secProducts.classList.toggle('hidden', tab !== 'products');
  secCategories.classList.toggle('hidden', tab !== 'categories');
  
  btnProducts.className = tab === 'products' ? 'px-4 py-2 rounded-xl font-bold bg-amber-500 text-slate-950' : 'px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white';
  btnCategories.className = tab === 'categories' ? 'px-4 py-2 rounded-xl font-bold bg-amber-500 text-slate-950' : 'px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white';
};

// ==========================================
// 4. CARGAR DATOS EN TABLAS
// ==========================================
async function loadData() {
  try {
    // Tabla Categorías
    document.getElementById('categoriesTable').innerHTML = allCategories.map(c => `
      <tr>
        <td class="p-4 font-bold text-white">${c.name}</td>
        <td class="p-4 text-slate-400">${c.sort_order}</td>
        <td class="p-4 text-right">
          <button onclick="editCategory('${c.id}')" class="text-blue-400 hover:text-white mr-2"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteCategory('${c.id}')" class="text-red-400 hover:text-white"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    // Tabla Productos
    const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    allProducts = prods || [];
    
    document.getElementById('productsTable').innerHTML = allProducts.map(p => `
      <tr>
        <td class="p-4"><img src="${p.image_url || 'https://via.placeholder.com/50?text=Sin+Foto'}" class="w-10 h-10 rounded-md object-cover"></td>
        <td class="p-4 font-bold text-white">${p.name} <br><span class="text-xs text-slate-500">${p.category_name}</span></td>
        <td class="p-4 text-amber-400 font-bold">$${p.price}</td>
        <td class="p-4 text-right">
          <button onclick="editProduct('${p.id}')" class="text-blue-400 hover:text-white mr-2"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteProduct('${p.id}')" class="text-red-400 hover:text-white"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

// ==========================================
// 5. FORMULARIO DE PRODUCTO
// ==========================================
window.showProductForm = function() {
  document.getElementById('form-section').classList.remove('hidden');
  document.getElementById('productForm').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').innerText = 'Nuevo Producto';
  document.getElementById('img-preview').classList.add('hidden');
  document.getElementById('variants-section').classList.add('hidden');
  document.getElementById('prod-cat').value = '';
};

window.hideProductForm = function() {
  document.getElementById('form-section').classList.add('hidden');
};

document.getElementById('prod-img').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.getElementById('img-preview');
      img.src = ev.target.result;
      img.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('prod-has-variants').addEventListener('change', (e) => {
  document.getElementById('variants-section').classList.toggle('hidden', !e.target.checked);
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const catValue = document.getElementById('prod-cat').value;
  if (!catValue) { alert("Por favor, selecciona una categoría."); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerText;
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('prod-id').value;
  const file = document.getElementById('prod-img').files[0];
  const hasVariants = document.getElementById('prod-has-variants').checked;
  
  try {
    let imageUrl = null;
    let imagePublicId = null;

    if (file) {
      const uploaded = await uploadImage(file);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.public_id;
    }
    if (id && !file) {
      const existing = allProducts.find(p => p.id === id);
      if (existing) { imageUrl = existing.image_url; imagePublicId = existing.image_public_id; }
    }

    let options = [];
    if (hasVariants) {
      options = [
        { label: 'Porción Pequeña', price: parseFloat(document.getElementById('prod-price-small').value) },
        { label: 'Porción Grande', price: parseFloat(document.getElementById('prod-price-large').value) }
      ];
    }

    const payload = {
      name: document.getElementById('prod-name').value,
      price: parseFloat(document.getElementById('prod-price').value),
      category_name: catValue,
      description: document.getElementById('prod-desc').value,
      image_url: imageUrl,
      image_public_id: imagePublicId,
      has_variants: hasVariants,
      options: options
    };

    if (id) await supabase.from('products').update(payload).eq('id', id);
    else await supabase.from('products').insert([payload]);

    alert('Producto guardado con éxito');
    hideProductForm();
    loadData();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
});

// ==========================================
// 6. FORMULARIO DE CATEGORÍA
// ==========================================
window.showCategoryForm = function() {
  document.getElementById('category-form-section').classList.remove('hidden');
  document.getElementById('categoryForm').reset();
  document.getElementById('cat-id').value = '';
  document.getElementById('category-form-title').innerText = 'Nueva Categoría';
  // Sugerir el siguiente número de orden
  document.getElementById('cat-order').value = allCategories.length + 1;
};

window.hideCategoryForm = function() {
  document.getElementById('category-form-section').classList.add('hidden');
};

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('cat-id').value;
  const payload = {
    name: document.getElementById('cat-name').value,
    sort_order: parseInt(document.getElementById('cat-order').value)
  };

  try {
    if (id) await supabase.from('categories').update(payload).eq('id', id);
    else await supabase.from('categories').insert([payload]);

    alert('Categoría guardada con éxito');
    hideCategoryForm();
    await loadCategoriesForSelect(); // Recargar el select de productos
    loadData(); // Recargar tabla
  } catch (err) {
    alert('Error al guardar categoría: ' + err.message);
  } finally {
    btn.innerText = 'Guardar Categoría';
    btn.disabled = false;
  }
});

// ==========================================
// 7. EDITAR / ELIMINAR
// ==========================================
window.editProduct = function(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  
  showProductForm();
  document.getElementById('form-title').innerText = 'Editar Producto';
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-cat').value = p.category_name;
  document.getElementById('prod-desc').value = p.description || '';
  
  if (p.image_url) {
    const img = document.getElementById('img-preview');
    img.src = p.image_url;
    img.classList.remove('hidden');
  }

  if (p.has_variants && p.options && p.options.length >= 2) {
    document.getElementById('prod-has-variants').checked = true;
    document.getElementById('variants-section').classList.remove('hidden');
    document.getElementById('prod-price-small').value = p.options[0].price;
    document.getElementById('prod-price-large').value = p.options[1].price;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async function(id) {
  if (!confirm('¿Eliminar producto?')) return;
  await supabase.from('products').delete().eq('id', id);
  loadData();
};

window.editCategory = function(id) {
  const c = allCategories.find(x => x.id === id);
  if (!c) return;
  
  showCategoryForm();
  document.getElementById('category-form-title').innerText = 'Editar Categoría';
  document.getElementById('cat-id').value = c.id;
  document.getElementById('cat-name').value = c.name;
  document.getElementById('cat-order').value = c.sort_order;
};

window.deleteCategory = async function(id) {
  if (!confirm('¿Eliminar categoría? Si tiene productos, no se borrará.')) return;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) alert('No se puede eliminar: tiene productos asignados.');
  else {
    await loadCategoriesForSelect();
    loadData();
  }
};

// Iniciar
initApp();