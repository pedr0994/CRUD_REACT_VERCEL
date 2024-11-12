// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';
import UserForm from './components/UserForm';
import UserList from './components/UserList';
import ConfirmModal from './components/ConfirmModal';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DATABASE_NAME = 'UserDB';
const STORE_NAME = 'users';

const App = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [userToUpdate, setUserToUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(5);
  const [creationOrder, setCreationOrder] = useState('asc');
  const [ageOrder, setAgeOrder] = useState('asc');
  const [nameOrder, setNameOrder] = useState('asc');
  const [darkMode, setDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem('darkMode');
    return storedTheme === 'true';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [modalAction, setModalAction] = useState('');

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const initDB = async () => {
    return openDB(DATABASE_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  };

  const fetchUsers = useCallback(async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allUsers = await store.getAll();
    setUsers(allUsers);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const createUser = async (user) => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await store.add(user);
      await tx.done;
      toast.success("Usuario creado con éxito!", { theme: darkMode ? 'dark' : 'light' });
      fetchUsers();
    } catch (error) {
      console.error("Error al crear usuario:", error);
      toast.error("Error al crear usuario. Verifique los datos.", { theme: darkMode ? 'dark' : 'light' });
    }
  };

  const confirmUpdateUser = async (updatedUser) => {
    if (!updatedUser) return;
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await store.put(updatedUser);
      await tx.done;
      toast.success("Usuario actualizado con éxito!", { theme: darkMode ? 'dark' : 'light' });
      setIsModalOpen(false);
      setEditingUser(null);
      setUserToUpdate(null);
      fetchUsers();
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      toast.error("Error al actualizar usuario. Intente nuevamente.", { theme: darkMode ? 'dark' : 'light' });
    }
  };

  const initiateEditUser = (user) => {
    setEditingUser(user);
    setUserToUpdate(user);
  };

  const confirmDeleteUser = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await store.delete(userToDelete.id);
      await tx.done;
      toast.success("Usuario eliminado con éxito!", { theme: darkMode ? 'dark' : 'light' });
      setIsModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      toast.error("Error al eliminar usuario. Intente nuevamente.", { theme: darkMode ? 'dark' : 'light' });
    }
  };

  const cancelModalAction = () => {
    setIsModalOpen(false);
    setUserToDelete(null);
    setUserToUpdate(null);
    setEditingUser(null);
  };

  const filteredUsers = users.filter((user) => {
    const searchLowerCase = searchTerm.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(searchLowerCase)) ||
      (user.email && user.email.toLowerCase().includes(searchLowerCase)) ||
      (user.age && user.age.toString().includes(searchLowerCase))
    );
  });

  const sortedFilteredUsers = [...filteredUsers].sort((a, b) => {
    if (creationOrder !== 'asc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (ageOrder !== 'asc') {
      return b.age - a.age;
    }
    return nameOrder === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

  const totalPages = Math.ceil(sortedFilteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedFilteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const handlePageChange = (event) => {
    setCurrentPage(Number(event.target.value));
  };

  const handleUsersPerPageChange = (event) => {
    setUsersPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const toggleCreationOrder = () => setCreationOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  const toggleAgeOrder = () => setAgeOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  const toggleNameOrder = () => setNameOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));

  return (
    <div className={`container ${darkMode ? 'dark-mode' : ''}`}>
      <h1>CRUD de Usuarios</h1>
      <button onClick={toggleTheme} className="theme-toggle">
        {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
      </button>
      <input
        className="search-bar"
        type="text"
        placeholder="Buscar por nombre, correo o edad"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <p className="total-users">
        Resultados encontrados: {filteredUsers.length} / Total de usuarios: {users.length}
      </p>
      <div className="sort-buttons">
        <button onClick={toggleNameOrder}>
          {nameOrder === 'asc' ? 'Nombre: A-Z' : 'Nombre: Z-A'}
        </button>
        <button onClick={toggleAgeOrder}>
          {ageOrder === 'asc' ? 'Edad: Menor a Mayor' : 'Edad: Mayor a Menor'}
        </button>
        <button onClick={toggleCreationOrder}>
          {creationOrder === 'asc' ? 'Más Reciente Primero' : 'Más Antiguo Primero'}
        </button>
      </div>
      <UserForm
        createUser={createUser}
        updateUser={confirmUpdateUser}
        editingUser={editingUser}
        setEditingUser={initiateEditUser}
      />
      <UserList
        users={currentUsers}
        setEditingUser={initiateEditUser}
        deleteUser={(id) => {
          setUserToDelete(users.find((u) => u.id === id));
          setModalAction('delete');
          setIsModalOpen(true);
        }}
      />
      <div className="pagination">
        <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
          Anterior
        </button>
        <span>Página:</span>
        <select value={currentPage} onChange={handlePageChange}>
          {[...Array(totalPages).keys()].map((i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
          Siguiente
        </button>
      </div>
      <div>
        <span>Usuarios por página:</span>
        <select value={usersPerPage} onChange={handleUsersPerPageChange}>
          {[5, 10, 15, 20].map((num) => (
            <option key={num} value={num}>{num}</option>          ))}
            </select>
          </div>
          <ConfirmModal
            isOpen={isModalOpen}
            onConfirm={modalAction === 'delete' ? confirmDeleteUser : () => confirmUpdateUser(userToUpdate)}
            onCancel={cancelModalAction}
            userName={
              modalAction === 'delete'
                ? userToDelete ? userToDelete.name : ''
                : userToUpdate ? userToUpdate.name : ''
            }
            darkMode={darkMode}
            actionType={modalAction}
          />
          <ToastContainer />
        </div>
      );
    };
    
    export default App;
    
         
