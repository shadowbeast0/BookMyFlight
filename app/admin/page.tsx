'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient, FlightDeal } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export default function AdminPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuthContext();
  const [deals, setDeals] = useState<FlightDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<FlightDeal>>({
    departureCity: '',
    arrivalCity: '',
    cost: 0,
    discount: 0,
    durationMinutes: 120,
    departureDate: '',
    expiresAt: '',
    isActive: true,
  });

  // Load deals
  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getAllDeals();
        setDeals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deals');
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  const handleReset = () => {
    setFormData({
      departureCity: '',
      arrivalCity: '',
      cost: 0,
      discount: 0,
      durationMinutes: 120,
      departureDate: '',
      expiresAt: '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    try {
      setError(null);

      if (!formData.departureCity || !formData.arrivalCity || !formData.cost || !formData.durationMinutes) {
        setError('Please fill in all required fields');
        return;
      }

      if (editingId) {
        const updated = await apiClient.updateDeal(editingId, formData);
        setDeals(deals.map((d) => (d.id === editingId ? updated : d)));
      } else {
        const created = await apiClient.createDeal(formData as Omit<FlightDeal, 'id'>);
        setDeals([...deals, created]);
      }

      handleReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deal');
    }
  };

  const handleEdit = (deal: FlightDeal) => {
    setFormData(deal);
    setEditingId(deal.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) {
      return;
    }

    try {
      setError(null);
      await apiClient.deleteDeal(id);
      setDeals(deals.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deal');
    }
  };

  // Admin guard
  if (!isLoggedIn || !isAdmin) {
    return (
      <main className="min-h-screen cyber-bg text-white">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 mb-6">
            <svg className="w-10 h-10 text-destructive/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v.01M12 9v2m0-8a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
          <p className="text-purple-100/70 mb-6">
            {!isLoggedIn
              ? 'Please login with an admin phone number to access this page.'
              : 'Your account does not have admin privileges.'}
          </p>
          <Button onClick={() => router.push('/')} className="font-semibold bg-violet-500 hover:bg-violet-400 text-white">
            Go to Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen cyber-bg text-white">
      {/* Admin Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-900/80 via-purple-900/70 to-fuchsia-900/50 py-10 border-b border-purple-400/20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-extrabold text-white mb-1 animate-fade-in-up display-font neon-title">Admin Dashboard</h1>
          <p className="text-purple-100/65 animate-fade-in-up animation-delay-100">Manage all flights and special deals</p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Action Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-8 bg-violet-500 hover:bg-violet-400 text-white font-semibold"
          >
            + Create New Flight
          </Button>
        )}

        {/* Form */}
        {showForm && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {editingId ? 'Edit Deal' : 'Create New Deal'}
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Departure City *
                </label>
                <Input
                  placeholder="e.g., Mumbai"
                  value={formData.departureCity || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, departureCity: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Arrival City *
                </label>
                <Input
                  placeholder="e.g., Delhi"
                  value={formData.arrivalCity || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalCity: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price (₹) *
                </label>
                <Input
                  type="number"
                  placeholder="4999"
                  value={formData.cost || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Discount (%)
                </label>
                <Input
                  type="number"
                  placeholder="15"
                  min="0"
                  max="100"
                  value={formData.discount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (minutes) *
                </label>
                <Input
                  type="number"
                  placeholder="120"
                  min="15"
                  max="1440"
                  value={formData.durationMinutes || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationMinutes: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Departure Date *
                </label>
                <Input
                  type="datetime-local"
                  value={
                    formData.departureDate
                      ? new Date(formData.departureDate)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departureDate: new Date(e.target.value).toISOString(),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Deal Expires At *
                </label>
                <Input
                  type="datetime-local"
                  value={
                    formData.expiresAt
                      ? new Date(formData.expiresAt)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiresAt: new Date(e.target.value).toISOString(),
                    })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Active Deal
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-6">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                className="bg-violet-500 hover:bg-violet-400 text-white font-semibold"
              >
                {editingId ? 'Update Deal' : 'Create Deal'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Deals Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No deals yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-medium text-foreground">
                          {deal.departureCity.split(',')[0]} → {deal.arrivalCity.split(',')[0]}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-primary">₹{deal.cost.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-muted-foreground">
                          {deal.discount ? `${deal.discount}%` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-muted-foreground">
                          {deal.durationMinutes ? `${Math.floor(deal.durationMinutes / 60)}h ${deal.durationMinutes % 60}m` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(deal.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            deal.isActive
                              ? 'bg-accent/20 text-accent'
                              : 'bg-destructive/20 text-destructive'
                          }`}
                        >
                          {deal.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          onClick={() => handleEdit(deal)}
                          variant="ghost"
                          size="sm"
                          className="mr-2"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(deal.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
