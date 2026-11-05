import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext'; // adjust if your hook is named differently

// Drop-in panel for the Admin page: lists users and lets an admin change roles.
// Usage in pages/Admin.jsx:  import UserRoles from '../components/admin/UserRoles';  ...  <UserRoles />
const ROLES = ['reader', 'author', 'admin'];

export default function UserRoles() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/users', { params: { search: q || undefined, limit: 100 } });
      setUsers(res.data.data);
      setError('');
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    setSavingId(id);
    try {
      const res = await axiosClient.patch(`/users/${id}/role`, { role });
      setUsers((list) => list.map((u) => (u.id === id ? { ...u, role: res.data.user.role } : u)));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change role.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-10">
      <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">User Roles</h2>
          <p className="text-gray-500 text-sm">Promote readers to authors so they can write posts.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email"
                 className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Search</button>
        </form>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 text-sm">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td className="px-6 py-4 text-gray-500" colSpan={3}>Loading...</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-6 py-3 text-gray-600">{u.email}</td>
                <td className="px-6 py-3">
                  <select value={u.role} disabled={savingId === u.id || u.id === me?.id}
                          title={u.id === me?.id ? 'You cannot change your own role' : ''}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-sm capitalize">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
