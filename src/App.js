// src/App.js
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, 
  query, orderBy, Timestamp 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from 'firebase/auth';
import { db, auth } from './firebase';
import './App.css';

function App() {
  // Estados de autenticación
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  // Estados del inventario
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busquedaInventario, setBusquedaInventario] = useState('');
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  // Estados del carrito (ventas)
  const [carrito, setCarrito] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [paginaActual, setPaginaActual] = useState('inventario');

  // Estados de alertas
  const [alertasStock, setAlertasStock] = useState([]);

  // ============================================
  // AUTENTICACIÓN
  // ============================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        setUser(usuario);
        cargarProductos();
        cargarVentas();
      } else {
        setUser(null);
        setProductos([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCarrito([]);
  };

  // ============================================
  // CRUD PRODUCTOS
  // ============================================

  const cargarProductos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'productos'));
      const productosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProductos(productosData);
      setProductosFiltrados(productosData);
      
      // Verificar alertas de stock bajo
      const alertas = productosData.filter(p => p.stock <= p.stockMinimo);
      setAlertasStock(alertas);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  // Filtro para inventario
  useEffect(() => {
    const filtrados = productos.filter(p => 
      p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())
    );
    setProductosFiltrados(filtrados);
  }, [busquedaInventario, productos]);

  // Productos filtrados para ventas
  const productosVentas = productos.filter(p => 
    p.nombre.toLowerCase().includes(busquedaVentas.toLowerCase())
  );

  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !precio || !stock) {
      alert('Complete todos los campos');
      return;
    }

    try {
      await addDoc(collection(db, 'productos'), {
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        stockMinimo: parseInt(stockMinimo) || 5,
        fechaCreacion: Timestamp.now()
      });
      setNombre('');
      setPrecio('');
      setStock('');
      setStockMinimo('');
      cargarProductos();
      alert('✅ Producto agregado');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al agregar producto');
    }
  };

  const actualizarProducto = async (e) => {
    e.preventDefault();
    try {
      const productoRef = doc(db, 'productos', editandoId);
      await updateDoc(productoRef, {
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        stockMinimo: parseInt(stockMinimo) || 5
      });
      setEditandoId(null);
      setNombre('');
      setPrecio('');
      setStock('');
      setStockMinimo('');
      cargarProductos();
      alert('✅ Producto actualizado');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const eliminarProducto = async (id) => {
    if (window.confirm('¿Eliminar este producto?')) {
      try {
        await deleteDoc(doc(db, 'productos', id));
        cargarProductos();
        alert('✅ Producto eliminado');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const editarProducto = (producto) => {
    setEditandoId(producto.id);
    setNombre(producto.nombre);
    setPrecio(producto.precio);
    setStock(producto.stock);
    setStockMinimo(producto.stockMinimo || 5);
  };

  // ============================================
  // VENTAS (CARRITO)
  // ============================================

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item.id === producto.id);
    if (existe) {
      if (existe.cantidad + 1 > producto.stock) {
        alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock} unidades`);
        return;
      }
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio }
          : item
      ));
    } else {
      if (1 > producto.stock) {
        alert(`⚠️ Stock insuficiente`);
        return;
      }
      setCarrito([...carrito, {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        subtotal: producto.precio
      }]);
    }
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      eliminarDelCarrito(id);
      return;
    }
    const productoOriginal = productos.find(p => p.id === id);
    if (nuevaCantidad > productoOriginal.stock) {
      alert(`⚠️ Stock insuficiente. Solo hay ${productoOriginal.stock} unidades`);
      return;
    }
    setCarrito(carrito.map(item =>
      item.id === id
        ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio }
        : item
    ));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  const confirmarVenta = async () => {
    if (carrito.length === 0) {
      alert('Agregue productos al carrito');
      return;
    }

    try {
      // Actualizar stock de cada producto
      for (const item of carrito) {
        const productoRef = doc(db, 'productos', item.id);
        const productoOriginal = productos.find(p => p.id === item.id);
        const nuevoStock = productoOriginal.stock - item.cantidad;
        await updateDoc(productoRef, { stock: nuevoStock });
      }

      // Registrar venta
      await addDoc(collection(db, 'ventas'), {
        items: carrito,
        total: totalCarrito,
        usuario: user.email,
        fecha: Timestamp.now(),
        metodoPago: 'efectivo'
      });

      alert(`✅ Venta registrada\nTotal: S/ ${totalCarrito.toFixed(2)}`);
      setCarrito([]);
      cargarProductos();
      cargarVentas();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar venta');
    }
  };

  // ============================================
  // HISTORIAL DE VENTAS
  // ============================================

  const cargarVentas = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'ventas'), orderBy('fecha', 'desc'))
      );
      const ventasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVentas(ventasData);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🏥 Botica Nova Salud</h1>
          <h3>Sistema de Gestión</h3>
          <form onSubmit={handleAuth}>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit">{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</button>
            <p onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </p>
          </form>
          <div className="demo-creds">
            <small>📋 Demo: cualquier email/contraseña (Firebase crea cuenta automáticamente)</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Barra de navegación */}
      <nav className="navbar">
        <div className="logo">
          <h2>🏥 Botica Nova Salud</h2>
          <span>Gestión de Inventario y Ventas</span>
        </div>
        <div className="user-info">
          <span>👤 {user.email}</span>
          <button onClick={handleLogout}>Cerrar Sesión</button>
        </div>
      </nav>

      {/* Alertas de stock bajo */}
      {alertasStock.length > 0 && (
        <div className="alert-banner">
          ⚠️ <strong>¡Atención!</strong> {alertasStock.length} producto(s) con stock bajo:
          {alertasStock.map(p => ` ${p.nombre} (${p.stock} uds)`).join(', ')}
        </div>
      )}

      {/* Menú lateral */}
      <div className="main-container">
        <div className="sidebar">
          <button className={paginaActual === 'inventario' ? 'active' : ''} onClick={() => setPaginaActual('inventario')}>
            📦 Inventario
          </button>
          <button className={paginaActual === 'ventas' ? 'active' : ''} onClick={() => setPaginaActual('ventas')}>
            💰 Punto de Venta
            {carrito.length > 0 && <span className="badge">{carrito.length}</span>}
          </button>
          <button className={paginaActual === 'historial' ? 'active' : ''} onClick={() => setPaginaActual('historial')}>
            📋 Historial
          </button>
        </div>

        <div className="content">
          {/* Página: Inventario */}
          {paginaActual === 'inventario' && (
            <div>
              <div className="card">
                <h3>{editandoId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h3>
                <form onSubmit={editandoId ? actualizarProducto : agregarProducto} className="form-inline">
                  <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  <input type="number" placeholder="Precio S/" value={precio} onChange={(e) => setPrecio(e.target.value)} required step="0.01" />
                  <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required />
                  <input type="number" placeholder="Stock Mínimo" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
                  <button type="submit">{editandoId ? 'Actualizar' : 'Agregar'}</button>
                  {editandoId && <button type="button" onClick={() => { setEditandoId(null); setNombre(''); setPrecio(''); setStock(''); setStockMinimo(''); }}>Cancelar</button>}
                </form>
              </div>

              <div className="card">
                <h3>📦 Inventario de Productos</h3>
                {/* BUSCADOR PARA INVENTARIO */}
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="🔍 Buscar producto..." 
                  value={busquedaInventario}
                  onChange={(e) => setBusquedaInventario(e.target.value)}
                />
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign: 'center'}}>No hay productos</td></tr>
                    ) : (
                      productosFiltrados.map(p => (
                        <tr key={p.id} className={p.stock <= p.stockMinimo ? 'stock-bajo' : ''}>
                          <td>{p.nombre}</td>
                          <td>S/ {p.precio.toFixed(2)}</td>
                          <td>{p.stock}</td>
                          <td>{p.stockMinimo}</td>
                          <td>{p.stock <= p.stockMinimo ? '⚠️ Stock Bajo' : '✅ Normal'}</td>
                          <td>
                            <button className="btn-edit" onClick={() => editarProducto(p)}>✏️</button>
                            <button className="btn-delete" onClick={() => eliminarProducto(p.id)}>🗑️</button>
                            <button className="btn-sell" onClick={() => { agregarAlCarrito(p); setPaginaActual('ventas'); }}>💲 Vender</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Página: Punto de Venta */}
          {paginaActual === 'ventas' && (
            <div className="ventas-container">
              <div className="card productos-disponibles">
                <h3>📦 Productos</h3>
                {/* BUSCADOR PARA PUNTO DE VENTA */}
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="🔍 Buscar producto para vender..." 
                  value={busquedaVentas}
                  onChange={(e) => setBusquedaVentas(e.target.value)}
                />
                <div className="productos-grid">
                  {productosVentas.length === 0 ? (
                    <p>No hay productos</p>
                  ) : (
                    productosVentas.map(p => (
                      <div key={p.id} className="producto-card" onClick={() => agregarAlCarrito(p)}>
                        <h4>{p.nombre}</h4>
                        <p>S/ {p.precio.toFixed(2)}</p>
                        <small>Stock: {p.stock}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card carrito">
                <h3>🛒 Carrito de Compras</h3>
                {carrito.length === 0 ? (
                  <p>No hay productos agregados</p>
                ) : (
                  <>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cant.</th>
                          <th>Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carrito.map(item => (
                          <tr key={item.id}>
                            <td>{item.nombre}</td>
                            <td>
                              <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>-</button>
                              {item.cantidad}
                              <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>+</button>
                            </td>
                            <td>S/ {item.subtotal.toFixed(2)}</td>
                            <td><button onClick={() => eliminarDelCarrito(item.id)}>🗑️</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="total-carrito">
                      <strong>TOTAL: S/ {totalCarrito.toFixed(2)}</strong>
                      <button className="btn-confirmar" onClick={confirmarVenta}>✅ Confirmar Venta</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Página: Historial */}
          {paginaActual === 'historial' && (
            <div className="card">
              <h3>📋 Historial de Ventas</h3>
              {ventas.length === 0 ? (
                <p>No hay ventas registradas</p>
              ) : (
                ventas.map(v => (
                  <div key={v.id} className="venta-item">
                    <div className="venta-header">
                      <strong>{v.fecha?.toDate().toLocaleString()}</strong>
                      <span>Usuario: {v.usuario}</span>
                      <strong className="total">S/ {v.total.toFixed(2)}</strong>
                    </div>
                    <div className="venta-detalle">
                      {v.items?.map((item, idx) => (
                        <span key={idx}>{item.cantidad}x {item.nombre}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;