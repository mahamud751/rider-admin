"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, money } from "@/lib/api";

type Section = "overview" | "riders" | "rides" | "fares" | "commission" | "settings";
type User = { _id: string; name?: string; phone?: string; email?: string; vehicleType?: string; accountStatus?: string; commissionDue?: number; commissionRate?: number | null; isOnDuty?: boolean; createdAt: string };
type Ride = { _id: string; customer?: User; rider?: User; pickup: { address: string }; drop: { address: string }; fare: number; status: string; vehicle: string; fareZoneName?: string; createdAt: string };
type Rate = { perKmRate: number; minimumFare: number; enabled: boolean };
type Zone = { _id: string; name: string; center: { latitude: number; longitude: number }; radiusKm: number; priority: number; active: boolean; rates: { bike: Rate; auto: Rate } };

const nav: { id: Section; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "riders", label: "Riders", icon: "♙" },
  { id: "rides", label: "Rides", icon: "↗" },
  { id: "fares", label: "Fare zones", icon: "◎" },
  { id: "commission", label: "Commission", icon: "৳" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>("overview");

  useEffect(() => { setToken(localStorage.getItem("rider_admin_token")); setChecking(false); }, []);
  if (checking) return <div className="center"><span className="spinner" /></div>;
  if (!token) return <Login onLogin={(next) => setToken(next)} />;
  return <Dashboard section={section} setSection={setSection} logout={() => { localStorage.removeItem("rider_admin_token"); setToken(null); }} />;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await api<{ access_token: string; user: User & { role: string } }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password, role: "admin" }) });
      if (data.user.role !== "admin") throw new Error("This account is not an administrator");
      localStorage.setItem("rider_admin_token", data.access_token); onLogin(data.access_token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); } finally { setBusy(false); }
  }
  return <main className="loginShell">
    <section className="loginBrand"><BrandLogo large /><div><p className="eyebrow">BAHON OPERATIONS</p><h1>Keep every trip<br />moving forward.</h1><p>One place to manage your fleet, fares, commissions and customer experience.</p></div><div className="brandStats"><span><b>24/7</b> Operations</span><span><b>Live</b> Ride visibility</span></div></section>
    <section className="loginPanel"><form onSubmit={submit} className="loginCard"><p className="eyebrow">SECURE ADMIN</p><h2>Welcome back</h2><p className="muted">Sign in to your operations workspace.</p>{error && <div className="alert error">{error}</div>}<label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@rider.com" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></label><button className="primary wide" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"}</button><small>Protected administrative access</small></form></section>
  </main>;
}

function Dashboard({ section, setSection, logout }: { section: Section; setSection: (s: Section) => void; logout: () => void }) {
  return <div className="appShell"><aside><div className="logo"><BrandLogo /></div><nav>{nav.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}><i>{item.icon}</i>{item.label}</button>)}</nav><div className="asideFoot"><div className="statusDot"><span /> System online</div><button onClick={logout}>↪ Sign out</button></div></aside><main className="workspace"><Header section={section} />{section === "overview" && <Overview go={setSection} />}{section === "riders" && <Riders />}{section === "rides" && <Rides />}{section === "fares" && <Fares />}{section === "commission" && <Commission />}{section === "settings" && <Settings />}</main></div>;
}

function BrandLogo({ large = false }: { large?: boolean }) {
  return <div className={`logoAsset ${large ? "large" : ""}`}><img src="/bahon-logo.jpeg" alt="Bahon" /></div>;
}

function Header({ section }: { section: Section }) {
  const title = nav.find((n) => n.id === section)?.label;
  return <header><div><p className="eyebrow">OPERATIONS / {title?.toUpperCase()}</p><h1>{title}</h1></div><div className="headerRight"><div className="live"><span /> Live</div><div className="avatar">AD</div></div></header>;
}

function Overview({ go }: { go: (s: Section) => void }) {
  const [data, setData] = useState<any>(null); const [riders, setRiders] = useState<User[]>([]); const [error, setError] = useState("");
  useEffect(() => { Promise.all([api<any>("/admin/statistics"), api<any>("/admin/users?role=rider&limit=6")]).then(([s, r]) => { setData(s.statistics); setRiders(r.users); }).catch((e) => setError(e.message)); }, []);
  if (error) return <Empty text={error} />; if (!data) return <Loading />;
  const cards = [{ label: "Active rides", value: data.rides.activeRides, icon: "↗", tone: "orange" }, { label: "Total riders", value: data.users.totalRiders, icon: "♙", tone: "blue" }, { label: "Completed rides", value: data.rides.completedRides, icon: "✓", tone: "green" }, { label: "Gross revenue", value: money(data.revenue.totalRevenue), icon: "৳", tone: "violet" }];
  return <><section className="hero"><div><p className="eyebrow">TODAY&apos;S PULSE</p><h2>Your operation at a glance</h2><p>Monitor activity, act on rider accounts and keep your service healthy.</p></div><button className="primary" onClick={() => go("riders")}>Manage riders →</button></section><div className="metricGrid">{cards.map((c) => <article className="metric" key={c.label}><div className={`metricIcon ${c.tone}`}>{c.icon}</div><p>{c.label}</p><strong>{c.value}</strong><small>{c.label === "Gross revenue" ? `${money(data.today.revenue)} today` : `${data.today.rides} rides today`}</small></article>)}</div><section className="panel"><div className="panelHead"><div><h3>Newest riders</h3><p>Recently registered fleet members</p></div><button className="ghost" onClick={() => go("riders")}>View all</button></div><RiderTable riders={riders} compact /></section></>;
}

function Riders() {
  const [riders, setRiders] = useState<User[]>([]); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [selected, setSelected] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [notice, setNotice] = useState("");
  const load = useCallback(() => { setLoading(true); api<any>(`/admin/users?role=rider&limit=100&search=${encodeURIComponent(search)}`).then((d) => setRiders(d.users)).finally(() => setLoading(false)); }, [search]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const filtered = useMemo(() => riders.filter((r) => status === "all" || (r.accountStatus || "active") === status), [riders, status]);
  async function changeStatus(rider: User, next: string) { const reason = next === "suspended" ? window.prompt("Reason for suspension (required):") : null; if (next === "suspended" && !reason) return; await api(`/admin/riders/${rider._id}/status`, { method: "PATCH", body: JSON.stringify({ status: next, reason }) }); setNotice(`${rider.name || "Rider"} is now ${next}.`); setSelected(null); load(); }
  return <><div className="toolbar"><div className="search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone…" /></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div>{notice && <div className="alert success">{notice}</div>}<section className="panel">{loading ? <Loading /> : <RiderTable riders={filtered} onSelect={setSelected} />}</section>{selected && <div className="modalBackdrop" onMouseDown={() => setSelected(null)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}>×</button><div className="profileBadge">{initials(selected.name)}</div><h2>{selected.name || "Unnamed rider"}</h2><p className="muted">{selected.phone} · {selected.vehicleType || "No vehicle"}</p><div className="detailGrid"><span>Account status<b><Status value={selected.accountStatus || "active"} /></b></span><span>On duty<b>{selected.isOnDuty ? "Yes" : "No"}</b></span><span>Commission due<b>{money(selected.commissionDue)}</b></span><span>Custom rate<b>{selected.commissionRate == null ? "Default" : `${selected.commissionRate}%`}</b></span></div>{selected.accountStatus === "suspended" ? <button className="primary wide" onClick={() => changeStatus(selected, "active")}>Reactivate rider</button> : <button className="danger wide" onClick={() => changeStatus(selected, "suspended")}>Suspend rider</button>}</div></div>}</>;
}

function RiderTable({ riders, compact = false, onSelect }: { riders: User[]; compact?: boolean; onSelect?: (u: User) => void }) {
  if (!riders.length) return <Empty text="No riders found" />;
  return <div className="tableWrap"><table><thead><tr><th>Rider</th><th>Vehicle</th><th>Status</th><th>Commission due</th><th>Joined</th>{!compact && <th />}</tr></thead><tbody>{riders.map((r) => <tr key={r._id} onClick={() => onSelect?.(r)} className={onSelect ? "clickable" : ""}><td><div className="person"><span>{initials(r.name)}</span><div><b>{r.name || "Unnamed rider"}</b><small>{r.phone || r.email || "—"}</small></div></div></td><td className="capitalize">{r.vehicleType || "—"}</td><td><Status value={r.accountStatus || "active"} /></td><td>{money(r.commissionDue)}</td><td>{date(r.createdAt)}</td>{!compact && <td>›</td>}</tr>)}</tbody></table></div>;
}

function Rides() {
  const [rides, setRides] = useState<Ride[]>([]); const [filter, setFilter] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { api<any>(`/admin/rides?limit=100${filter ? `&status=${filter}` : ""}`).then((d) => setRides(d.rides)).finally(() => setLoading(false)); }, [filter]);
  return <><div className="toolbar"><div><b>Ride ledger</b><p className="muted">Every request and its current state</p></div><select value={filter} onChange={(e) => { setLoading(true); setFilter(e.target.value); }}><option value="">All rides</option><option>SEARCHING_FOR_RIDER</option><option>START</option><option>ARRIVED</option><option>COMPLETED</option><option>CANCELLED</option></select></div><section className="panel">{loading ? <Loading /> : <div className="tableWrap"><table><thead><tr><th>Route</th><th>Rider</th><th>Service</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody>{rides.map((r) => <tr key={r._id}><td><div className="route"><b>{r.pickup.address}</b><small>to {r.drop.address}</small></div></td><td>{r.rider?.name || "Unassigned"}</td><td><span className="capitalize">{r.vehicle}</span>{r.fareZoneName && <small className="block">{r.fareZoneName}</small>}</td><td><b>{money(r.fare)}</b></td><td><Status value={r.status} /></td><td>{date(r.createdAt)}</td></tr>)}</tbody></table>{!rides.length && <Empty text="No rides match this filter" />}</div>}</section></>;
}

function Fares() {
  const empty = { name: "", latitude: "", longitude: "", radiusKm: "5", bikeRate: "15", bikeMinimum: "25", autoRate: "18", autoMinimum: "30" };
  const [zones, setZones] = useState<Zone[]>([]); const [form, setForm] = useState(empty); const [show, setShow] = useState(false); const [notice, setNotice] = useState("");
  const load = useCallback(() => api<any>("/admin/fare-zones").then((d) => setZones(d.zones)), []); useEffect(() => { load(); }, [load]);
  async function create(e: FormEvent) { e.preventDefault(); await api("/admin/fare-zones", { method: "POST", body: JSON.stringify({ name: form.name, center: { latitude: +form.latitude, longitude: +form.longitude }, radiusKm: +form.radiusKm, rates: { bike: { perKmRate: +form.bikeRate, minimumFare: +form.bikeMinimum, enabled: true }, auto: { perKmRate: +form.autoRate, minimumFare: +form.autoMinimum, enabled: true } } }) }); setForm(empty); setShow(false); setNotice("Fare zone created."); load(); }
  async function remove(id: string) { if (!confirm("Delete this fare zone?")) return; await api(`/admin/fare-zones/${id}`, { method: "DELETE" }); load(); }
  return <>{notice && <div className="alert success">{notice}</div>}<section className="hero slim"><div><p className="eyebrow">GEOGRAPHIC PRICING</p><h2>Charge the right fare in every area</h2><p>The highest-priority matching radius controls the quoted fare.</p></div><button className="primary" onClick={() => setShow(true)}>+ New fare zone</button></section><div className="zoneGrid">{zones.map((z) => <article className="zone" key={z._id}><div className="zoneMap"><div className="rings"><span /></div><label>{z.radiusKm} km radius</label></div><div className="zoneBody"><div className="between"><div><Status value={z.active ? "active" : "disabled"} /><h3>{z.name}</h3></div><button className="iconDanger" onClick={() => remove(z._id)}>×</button></div><p className="coords">{z.center.latitude.toFixed(4)}, {z.center.longitude.toFixed(4)}</p><div className="rates"><span>Motorcycle<b>৳{z.rates.bike.perKmRate}/km</b><small>Min ৳{z.rates.bike.minimumFare}</small></span><span>Easybike<b>৳{z.rates.auto.perKmRate}/km</b><small>Min ৳{z.rates.auto.minimumFare}</small></span></div></div></article>)}{!zones.length && <div className="panel"><Empty text="No area fares yet. Global rates are currently used everywhere." /></div>}</div>{show && <div className="modalBackdrop"><form className="modal formModal" onSubmit={create}><button type="button" className="close" onClick={() => setShow(false)}>×</button><p className="eyebrow">NEW AREA</p><h2>Create fare zone</h2><div className="formGrid"><label className="full">Area name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Central Dhaka" /></label><label>Center latitude<input required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></label><label>Center longitude<input required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></label><label>Radius (km)<input required type="number" min="0.1" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })} /></label><span /><h4 className="full">Motorcycle fare</h4><label>Per km<input type="number" value={form.bikeRate} onChange={(e) => setForm({ ...form, bikeRate: e.target.value })} /></label><label>Minimum<input type="number" value={form.bikeMinimum} onChange={(e) => setForm({ ...form, bikeMinimum: e.target.value })} /></label><h4 className="full">Easybike fare</h4><label>Per km<input type="number" value={form.autoRate} onChange={(e) => setForm({ ...form, autoRate: e.target.value })} /></label><label>Minimum<input type="number" value={form.autoMinimum} onChange={(e) => setForm({ ...form, autoMinimum: e.target.value })} /></label></div><button className="primary wide">Create zone</button></form></div>}</>;
}

function Commission() {
  const [riders, setRiders] = useState<User[]>([]); const [selected, setSelected] = useState<User | null>(null); const [amount, setAmount] = useState(""); const [method, setMethod] = useState("cash"); const [notice, setNotice] = useState("");
  const load = useCallback(() => api<any>("/admin/users?role=rider&limit=100").then((d) => setRiders(d.users)), []); useEffect(() => { load(); }, [load]);
  const total = riders.reduce((sum, r) => sum + (r.commissionDue || 0), 0);
  async function pay(e: FormEvent) { e.preventDefault(); if (!selected) return; await api(`/admin/riders/${selected._id}/commission-payments`, { method: "POST", body: JSON.stringify({ amount: +amount, method }) }); setNotice(`Payment recorded for ${selected.name}.`); setSelected(null); setAmount(""); load(); }
  return <><div className="metricGrid two"><article className="metric"><div className="metricIcon orange">৳</div><p>Total outstanding</p><strong>{money(total)}</strong><small>Across {riders.filter((r) => (r.commissionDue || 0) > 0).length} riders</small></article><article className="metric"><div className="metricIcon green">✓</div><p>Collection workflow</p><strong>Active</strong><small>Payments reduce balances immediately</small></article></div>{notice && <div className="alert success">{notice}</div>}<section className="panel"><div className="panelHead"><div><h3>Rider balances</h3><p>Select a rider to record a commission payment</p></div></div><div className="tableWrap"><table><thead><tr><th>Rider</th><th>Vehicle</th><th>Status</th><th>Amount due</th><th /></tr></thead><tbody>{riders.map((r) => <tr key={r._id}><td><div className="person"><span>{initials(r.name)}</span><div><b>{r.name || "Unnamed"}</b><small>{r.phone}</small></div></div></td><td className="capitalize">{r.vehicleType || "—"}</td><td><Status value={r.accountStatus || "active"} /></td><td><b>{money(r.commissionDue)}</b></td><td><button className="ghost" disabled={!r.commissionDue} onClick={() => { setSelected(r); setAmount(String(r.commissionDue || "")); }}>Record payment</button></td></tr>)}</tbody></table></div></section>{selected && <div className="modalBackdrop"><form className="modal" onSubmit={pay}><button type="button" className="close" onClick={() => setSelected(null)}>×</button><p className="eyebrow">COMMISSION PAYMENT</p><h2>{selected.name}</h2><p className="muted">Outstanding: {money(selected.commissionDue)}</p><label>Amount<input type="number" min="0.01" max={selected.commissionDue} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><label>Payment method<select value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_banking">Mobile banking</option><option value="adjustment">Adjustment</option></select></label><button className="primary wide">Confirm payment</button></form></div>}</>;
}

function Settings() {
  const [settings, setSettings] = useState({ commissionRate: 15, rideOfferCallsEnabled: false, maxCallsPerRide: 5, ridersPerOfferWave: 5, offerTimeoutSeconds: 20, maxOfferWaves: 3 }); const [rates, setRates] = useState({ bike: { perKmRate: 15, minimumFare: 25, enabled: true }, auto: { perKmRate: 18, minimumFare: 30, enabled: true } }); const [notice, setNotice] = useState("");
  useEffect(() => { Promise.all([api<any>("/admin/platform-settings"), api<any>("/admin/fare-settings")]).then(([s, f]) => { setSettings(s.settings); setRates(f.rates); }); }, []);
  async function save() { await Promise.all([api("/admin/platform-settings", { method: "PUT", body: JSON.stringify(settings) }), api("/admin/fare-settings", { method: "PUT", body: JSON.stringify({ rates }) })]); setNotice("Settings saved."); }
  return <div className="settingsStack">{notice && <div className="alert success">{notice}</div>}<section className="panel settings"><div><p className="eyebrow">COMMISSIONS</p><h3>Default commission</h3><p>Applied to completed rides unless a rider has a custom rate.</p></div><label className="suffix"><input type="number" min="0" max="100" value={settings.commissionRate} onChange={(e) => setSettings({ ...settings, commissionRate: +e.target.value })} /><span>%</span></label></section><section className="panel"><div className="panelHead"><div><p className="eyebrow">FREE DISPATCH</p><h3>Rider offer waves</h3><p>Notify the closest riders first, then expand automatically when nobody accepts.</p></div></div><div className="fareSettings"><div><label>Riders per wave<input type="number" min="1" max="25" value={settings.ridersPerOfferWave} onChange={(e) => setSettings({ ...settings, ridersPerOfferWave: +e.target.value })} /></label><label>Response time (seconds)<input type="number" min="10" max="60" value={settings.offerTimeoutSeconds} onChange={(e) => setSettings({ ...settings, offerTimeoutSeconds: +e.target.value })} /></label></div><div><label>Maximum free waves<input type="number" min="1" max="10" value={settings.maxOfferWaves} onChange={(e) => setSettings({ ...settings, maxOfferWaves: +e.target.value })} /></label></div></div></section><section className="panel settings"><div><p className="eyebrow">PAID FALLBACK</p><h3>Phone call backup</h3><p>Only call riders after every free Socket and FCM offer wave has expired. Requires Twilio server credentials.</p></div><label className="switch"><input type="checkbox" checked={settings.rideOfferCallsEnabled} onChange={(e) => setSettings({ ...settings, rideOfferCallsEnabled: e.target.checked })} /><span /></label><label>Maximum calls per ride<input type="number" min="0" max="50" value={settings.maxCallsPerRide} onChange={(e) => setSettings({ ...settings, maxCallsPerRide: +e.target.value })} /></label></section><section className="panel"><div className="panelHead"><div><p className="eyebrow">DEFAULT PRICING</p><h3>Global fares</h3><p>Used whenever pickup is outside every active fare zone.</p></div></div><div className="fareSettings">{(["bike", "auto"] as const).map((type) => <div key={type}><h4>{type === "bike" ? "Motorcycle" : "Easybike"}</h4><label>Per kilometer<input type="number" value={rates[type].perKmRate} onChange={(e) => setRates({ ...rates, [type]: { ...rates[type], perKmRate: +e.target.value } })} /></label><label>Minimum fare<input type="number" value={rates[type].minimumFare} onChange={(e) => setRates({ ...rates, [type]: { ...rates[type], minimumFare: +e.target.value } })} /></label></div>)}</div></section><button className="primary save" onClick={save}>Save all settings</button></div>;
}

function Status({ value }: { value: string }) { const low = value.toLowerCase(); const good = ["active", "completed", "arrived"].some((x) => low.includes(x)); const bad = ["suspended", "cancelled", "disabled"].some((x) => low.includes(x)); return <span className={`pill ${good ? "good" : bad ? "bad" : "wait"}`}>{value.replaceAll("_", " ")}</span>; }
function Loading() { return <div className="loading"><span className="spinner" /> Loading data…</div>; }
function Empty({ text }: { text: string }) { return <div className="empty"><b>◎</b><p>{text}</p></div>; }
function initials(name?: string) { return (name || "Rider").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(); }
function date(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
