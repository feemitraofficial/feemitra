'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
};

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [institutes, setInstitutes] = useState([]);
  const [revenue, setRevenue] = useState({});
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: adminRow } = await supabase
      .from('institute_admins')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (adminRow?.role !== 'super_admin') {
      setLoading(false);
      setAuthorized(false);
      return;
    }

    setAuthorized(true);
    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const { data: institutesData } = await supabase
      .from('institutes')
      .select('id, name, slug, status, plan, fee_paid, owner_email, owner_phone, created_at')
      .order('created_at', { ascending: false });

    const { data: revenueData } = await supabase
      .from('institute_revenue')
      .select('institute_id, total_revenue, payment_count');

    const revenueMap = {};
    (revenueData || []).forEach((r) => {
      revenueMap[r.institute_id] = r;
    });

    setInstitutes(institutesData || []);
    setRevenue(revenueMap);
  }

  async function updateStatus(id, status) {
    setActionError('');
    const { error } = await supabase.from('institutes').update({ status }).eq('id', id);
    if (error) {
      setActionError('Could not update status. Please try again.');
      return;
    }
    await loadData();
  }

  async function deleteInstitute(id) {
    if (!confirm('Delete this institute permanently? This cannot be undone.')) return;
    setActionError('');
    const { error } = await supabase.from('institutes').delete().eq('id', id);
    if (error) {
      setActionError('Could not delete — this institute may still have linked students, courses, or payments.');
      return;
    }
    await loadData();
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-gray-500">Loading...</main>;
  }

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </main>
    );
  }

  const totalRevenue = Object.values(revenue).reduce((sum, r) => sum + Number(r.total_revenue || 0), 0);
  const activeCount = institutes.filter((i) => i.status === 'active').length;
  const pendingCount = institutes.filter((i) => i.status === 'pending').length;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Super Admin Panel</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SummaryCard label="Total Institutes" value={institutes.length} />
          <SummaryCard label="Active" value={activeCount} />
          <SummaryCard label="Pending" value={pendingCount} />
        </div>

        <div className="mb-8 bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Revenue (all institutes)</p>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>

        {actionError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{actionError}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Institute</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {institutes.map((inst) => (
                <tr key={inst.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{inst.name}</td>
                  <td className="px-4 py-3 text-gray-600">{inst.owner_email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[inst.status] || 'bg-gray-100 text-gray-700'}`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inst.plan || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    ₹{Number(revenue[inst.id]?.total_revenue || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {inst.status !== 'active' && (
                        <button onClick={() => updateStatus(inst.id, 'active')} className="text-green-700 hover:underline">Approve</button>
                      )}
                      {inst.status !== 'blocked' && (
                        <button onClick={() => updateStatus(inst.id, 'blocked')} className="text-yellow-700 hover:underline">Block</button>
                      )}
                      <button onClick={() => deleteInstitute(inst.id)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {institutes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No institutes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
