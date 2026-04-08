"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  RefreshCw,
  Search,
  Loader2,
  Building,
  Mail,
  Plus,
  X,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  expertise: string[];
  syncedAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [editingExpertise, setEditingExpertise] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEmployees(data);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-employees", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      toast.success(`Synced ${data.synced} employees from Google Workspace`);
      await fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const addExpertiseTag = async (employeeId: string, currentExpertise: string[]) => {
    if (!newTag.trim()) return;
    const updated = [...new Set([...currentExpertise, newTag.trim().toLowerCase()])];
    await updateExpertise(employeeId, updated);
    setNewTag("");
  };

  const removeExpertiseTag = async (employeeId: string, currentExpertise: string[], tag: string) => {
    const updated = currentExpertise.filter((e) => e !== tag);
    await updateExpertise(employeeId, updated);
  };

  const updateExpertise = async (employeeId: string, expertise: string[]) => {
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertise }),
      });
      if (!res.ok) throw new Error("Update failed");
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, expertise } : e))
      );
      toast.success("Expertise updated");
    } catch {
      toast.error("Failed to update expertise");
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {employees.length} employees synced from Google Workspace
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync from Google Workspace
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search by name, email or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-900 border-zinc-700"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Users className="h-12 w-12 text-zinc-700" />
            <p className="text-zinc-300 font-medium">
              {employees.length === 0
                ? "No employees synced yet"
                : "No employees match your search"}
            </p>
            {employees.length === 0 && (
              <p className="text-zinc-500 text-sm max-w-sm">
                Click &quot;Sync from Google Workspace&quot; to import your team. Make sure
                GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_ADMIN_EMAIL are configured.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((employee) => (
            <Card key={employee.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-sm">{employee.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Mail className="h-3 w-3" />
                      {employee.email}
                    </div>
                    {(employee.role || employee.department) && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Building className="h-3 w-3" />
                        {[employee.role, employee.department].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>

                  {/* Expertise tags */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 mb-2">Expertise keywords (used for task assignment)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {employee.expertise.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 text-xs bg-violet-900/40 text-violet-300 border border-violet-800/50 rounded-full px-2.5 py-0.5"
                        >
                          {tag}
                          <button
                            onClick={() => removeExpertiseTag(employee.id, employee.expertise, tag)}
                            className="hover:text-white ml-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}

                      {editingExpertise === employee.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addExpertiseTag(employee.id, employee.expertise);
                              }
                              if (e.key === "Escape") {
                                setEditingExpertise(null);
                                setNewTag("");
                              }
                            }}
                            placeholder="e.g. frontend"
                            className="h-6 text-xs w-28 bg-zinc-800 border-zinc-600 px-2"
                          />
                          <Button
                            size="sm"
                            onClick={() => addExpertiseTag(employee.id, employee.expertise)}
                            className="h-6 px-2 text-xs bg-violet-600 hover:bg-violet-500"
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingExpertise(null); setNewTag(""); }}
                            className="h-6 px-1 text-xs text-zinc-400"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingExpertise(employee.id)}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-full px-2.5 py-0.5 transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          Add tag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
