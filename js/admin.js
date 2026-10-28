import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// 1. CONFIGURACIÓN (Asegúrate de tener tus datos reales aquí)
const SUPABASE_URL = 'https://wwizzismcjhphjfmtpcy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x0eBxaXrJ8zuda3n51UGXA_szWkMpSz';
const CLOUDINARY_CLOUD = 'a1fyaupj';
const CLOUDINARY_PRESET = 'menu_hotdog_unsigned';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let allProducts = [];
let allCategories = [];

// 2. VERIFICAR SESIÓN
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Si no hay sesión, podrías redirigir a un login. 
    // Por ahora, como no hemos creado el login, avisamos con un alert.
    alert('Debes iniciar sesión en Supabase Auth para editar.');
    // window.location.href = 'login.html'; 
  }
}
checkAuth();

// 3. CERRAR SESIÓN
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// 4. SUBIDA A CLOUDINARY
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

// 5. NAVEGACIÓN (Tabs)
function showTab(tab) {
  document.getElementById('section-products').classList.toggle('hidden', tab !== 'products');
  document.getElementById('section-categories').classList.toggle('hidden', tab !== 'categories');
  
  document.getElementById('tab-products').className = tab === 'products' ? 'px-4 py-2 rounded-xl font-bold bg-amber-500 text-slate-950' : 'px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white';
  document.getElementById('tab-categories').className = tab === 'categories' ? 'px-4 py-2 rounded-xl font-bold bg-amber-500 text-slate-950' : 'px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white';
}

// 6. CARGAR DATOS
async function loadData() {
  // Categorías
  const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
  allCategories = cats || [];
  document.getElementById('categoriesTable').innerHTML = allCategories.map(c => `
    <tr>
      <td class="p-4 font-bold text-white">${c.name}</td>
      <td class="p-4 text-right"><button onclick="deleteCategory('${c.id}')" class="text-red-400 hover:text-white"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join('');
  
  // Llenar Select del Formulario
  document.getElementById('prod-cat').innerHTML = allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  // Productos
  const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  allProducts = prods || [];
  document.getElementById('productsTable').innerHTML = allProducts.map(p => `
    <tr>
      <td class="p-4"><img src="${p.image_url || 'https://via.placeholder.com/50'}" class="w-10 h-10 rounded-md object-cover"></td>
      <td class="p-4 font-bold text-white">${p.name} <br><span class="text-xs text-slate-500">${p.category_name}</span></td>
      <td class="p-4 text-amber-400 font-bold">$${p.price}</td>
      <td class="p-4 text-right">
        <button onclick="editProduct('${p.id}')" class="text-blue-400 hover:text-white mr-2"><i class="fa-solid fa-pen"></i></button>
        <button onclick="deleteProduct('${p.id}')" class="text-red-400 hover:text-white"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}
loadData();

// 7. FORMULARIO
function showForm() {
  document.getElementById('form-section').classList.remove('hidden');
  document.getElementById('productForm').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').innerText = 'Nuevo Producto';
}

function hideForm() {
  document.getElementById('form-section').classList.add('hidden');
}

// Previsualización de Imagen
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

// Variantes
document.getElementById('prod-has-variants').addEventListener('change', (e) => {
  document.getElementById('variants-section').classList.toggle('hidden', !e.target.checked);
});

// Guardar Producto
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('prod-id').value;
  const file = document.getElementById('prod-img').files[0];
  const hasVariants = document.getElementById('prod-has-variants').checked;
  
  try {
    let imageUrl = null;
    let imagePublicId = null;

    // Si hay archivo, subir a Cloudinary
    if (file) {
      const uploaded = await uploadImage(file);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.public_id;
    }

    // Si estamos editando, conservar la imagen anterior si no se subió una nueva
    if (id && !file) {
      const existing = allProducts.find(p => p.id === id);
      if (existing) {
        imageUrl = existing.image_url;
        imagePublicId = existing.image_public_id;
      }
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
      category_name: document.getElementById('prod-cat').value,
      description: document.getElementById('prod-desc').value,
      image_url: imageUrl,
      image_public_id: imagePublicId,
      has_variants: hasVariants,
      options: options
    };

    if (id) {
      await supabase.from('products').update(payload).eq('id', id);
    } else {
      await supabase.from('products').insert([payload]);
    }

    alert('Guardado con éxito');
    hideForm();
    loadData();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.innerText = 'Guardar';
    btn.disabled = false;
  }
});

// Editar
function editProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  
  showForm();
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
}

// Eliminar
async function deleteProduct(id) {
  if (!confirm('¿Eliminar producto?')) return;
  await supabase.from('products').delete().eq('id', id);
  loadData();
}

async function deleteCategory(id) {
  if (!confirm('¿Eliminar categoría?')) return;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) alert('No se puede eliminar: tiene productos asociados.');
  else loadData();
}