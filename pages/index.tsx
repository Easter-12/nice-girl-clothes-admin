import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/Admin.module.css';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- THE MAIN PAGE COMPONENT (NO LOGIN) ---
export default function AdminPage() {
    return <Dashboard />;
}

// --- DASHBOARD COMPONENT ---
function Dashboard() {
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Fetch products
    const fetchProducts = async () => {
        setLoadingProducts(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) {
            setProducts(data);
        }
        setLoadingProducts(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (isEditing) {
            // Handle Update Logic
            const { error } = await supabase
                .from('products')
                .update({ name, description, price })
                .eq('id', editingId);

            if (error) {
                alert('Error updating product: ' + error.message);
            } else {
                resetForm();
                await fetchProducts();
            }

        } else {
            // Handle Add Logic
            if (!imageFile) {
                alert('Please select an image.');
                return;
            }

            const fileName = `${Date.now()}_${imageFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, imageFile);

            if (uploadError) {
                alert('Error uploading image: ' + uploadError.message);
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            const { error: insertError } = await supabase
                .from('products')
                .insert([{ name, description, price, image_url: publicUrl }]);

            if (insertError) {
                alert('Error adding product: ' + insertError.message);
            } else {
                resetForm();
                await fetchProducts();
            }
        }
    };
    
    const handleDelete = async (productId, imageUrl) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        await supabase.from('products').delete().eq('id', productId);
        
        const imageName = imageUrl.split('/').pop();
        await supabase.storage.from('product-images').remove([imageName]);

        await fetchProducts();
    };

    const handleEdit = (product) => {
        setIsEditing(true);
        setEditingId(product.id);
        setName(product.name);
        setDescription(product.description);
        setPrice(product.price);
        window.scrollTo(0, 0);
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditingId(null);
        setName('');
        setDescription('');
        setPrice('');
        setImageFile(null);
        const imageInput = document.getElementById('product-image');
        // THIS IS THE LINE THAT IS NOW CORRECTED
        if (imageInput) {
            (imageInput as HTMLInputElement).value = '';
        }
    };

    return (
        <div className={styles.adminPanel}>
            <header className={styles.header}>
                <h1>Control Room</h1>
            </header>
            
            <main>
                <div className={styles.formContainer}>
                    <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
                    <form onSubmit={handleFormSubmit}>
                        <input type="text" placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} required />
                        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required />
                        <input type="number" placeholder="Price (NGN)" value={price} onChange={e => setPrice(e.target.value)} required />
                        {!isEditing && <input type="file" id="product-image" onChange={e => setImageFile(e.target.files[0])} accept="image/*" />}
                         <div className={styles.formButtons}>
                            <button type="submit">{isEditing ? 'Update Product' : 'Add Product'}</button>
                            {isEditing && <button type="button" onClick={resetForm}>Cancel</button>}
                        </div>
                    </form>
                </div>

                <div className={styles.productsContainer}>
                    <h2>Existing Products</h2>
                    {loadingProducts ? <p>Loading...</p> : (
                        <div className={styles.productList}>
                            {products.map(product => (
                                <div key={product.id} className={styles.productItem}>
                                    <img src={product.image_url} alt={product.name} />
                                    <div className={styles.productDetails}>
                                        <h3>{product.name}</h3>
                                        <p>{product.description}</p>
                                        <span className={styles.productPrice}>NGN {Number(product.price).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.productActions}>
                                        <button onClick={() => handleEdit(product)}>Edit</button>
                                        <button onClick={() => handleDelete(product.id, product.image_url)} className={styles.deleteButton}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}