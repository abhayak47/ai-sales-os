import { useEffect, useState } from "react";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "rep",
  job_title: "",
};

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await API.get("/team/members");
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      await API.post("/team/members", form);
      setForm(EMPTY_FORM);
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not create member");
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await API.patch(`/team/members/${memberId}`, { role });
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not update role");
    }
  };

  const canManage = ["owner", "admin"].includes((user?.role || "").toLowerCase());

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />
      <div className="flex-1 overflow-y-auto mt-16 md:mt-0 p-4 md:p-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Team</div>
          <h1 className="text-2xl md:text-3xl font-bold">Workspace members, roles, and shared operating coverage</h1>
          <p className="text-white/45 text-sm mt-2 max-w-3xl">
            Manage the people operating inside this CRM workspace and keep permissions aligned to responsibility.
          </p>
        </div>

        {canManage && (
          <div className="premium-card p-5 mb-6">
            <div className="text-base font-semibold mb-4">Add member</div>
            <form onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.full_name} onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))} placeholder="Full name" className="input-surface" required />
              <input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="Email" className="input-surface" required />
              <input value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} placeholder="Temporary password" className="input-surface" required />
              <input value={form.job_title} onChange={(e) => setForm((current) => ({ ...current, job_title: e.target.value }))} placeholder="Job title" className="input-surface" />
              <select value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))} className="input-surface md:col-span-2">
                {["viewer", "rep", "manager", "admin"].map((role) => (
                  <option key={role} value={role} className="bg-black">
                    {role}
                  </option>
                ))}
              </select>
              <button className="button-primary md:col-span-2">Create member</button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="premium-card p-5">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{member.full_name}</div>
                  <div className="text-sm text-white/45 mt-1">{[member.job_title, member.email].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full border text-xs ${member.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-red-500/20 bg-red-500/10 text-red-200"}`}>
                    {member.is_active ? "active" : "inactive"}
                  </span>
                  {canManage ? (
                    <select value={member.role} onChange={(e) => handleRoleChange(member.id, e.target.value)} className="input-surface min-w-[140px]">
                      {["viewer", "rep", "manager", "admin", "owner"].map((role) => (
                        <option key={role} value={role} className="bg-black">
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full border border-white/10 text-xs text-white/55">{member.role}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
