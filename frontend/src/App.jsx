import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, Link } from "react-router-dom";
import api from "./api";

function getUser() {
  const raw = localStorage.getItem("lakshya_user");
  return raw ? JSON.parse(raw) : null;
}

function RequireAuth({ children, roles }) {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

function Layout({ children }) {
  const user = getUser();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("lakshya_token");
    localStorage.removeItem("lakshya_user");
    navigate("/login");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <strong>Lakshya TP Portal</strong>
          <span className="role-badge">{user?.role}</span>
        </div>
        <div className="top-actions">
          <span>{user?.name}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("lakshya_token", data.token);
      localStorage.setItem("lakshya_user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <h1>Lakshya</h1>
        <p className="muted">Training Partner Portal</p>

        {error && <div className="alert error">{error}</div>}

        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Enter email"
        />

        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Enter password"
        />

        <button type="submit">Login</button>

        <p className="hint">
          Initial admin: admin@lakshya.local / Admin@123
        </p>
      </form>
    </div>
  );
}

function Dashboard() {
  const user = getUser();

  return (
    <Layout>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Module 1 — HO onboarding and centre login management</p>
        </div>
      </div>

      {user.role === "ADMIN" && <AdminDashboard />}
      {user.role === "HO" && <HODashboard />}
      {user.role === "CENTRE" && <CentreDashboard />}
    </Layout>
  );
}

function AdminDashboard() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({
    companyName: "", pan: "", gst: "", contactPerson: "", email: "",
    phone: "", address: "", hoName: "", hoEmail: "", hoPassword: ""
  });
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data } = await api.get("/admin/training-partners");
    setPartners(data.trainingPartners);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/admin/training-partners", form);
      setMessage("Training Partner created successfully.");
      setForm({
        companyName: "", pan: "", gst: "", contactPerson: "", email: "",
        phone: "", address: "", hoName: "", hoEmail: "", hoPassword: ""
      });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create TP");
    }
  };

  const toggle = async (id, status) => {
    await api.patch(`/admin/training-partners/${id}/status`, {
      status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    });
    load();
  };

  return (
    <>
      <section className="card">
        <h2>Create Training Partner HO</h2>
        {message && <div className="alert">{message}</div>}

        <form className="grid-form" onSubmit={submit}>
          <input required placeholder="Company name"
            value={form.companyName} onChange={e => setForm({...form, companyName:e.target.value})}/>
          <input required placeholder="PAN"
            value={form.pan} onChange={e => setForm({...form, pan:e.target.value})}/>
          <input placeholder="GST"
            value={form.gst} onChange={e => setForm({...form, gst:e.target.value})}/>
          <input required placeholder="Contact person"
            value={form.contactPerson} onChange={e => setForm({...form, contactPerson:e.target.value})}/>
          <input required type="email" placeholder="Company email"
            value={form.email} onChange={e => setForm({...form, email:e.target.value})}/>
          <input required placeholder="Phone"
            value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}/>
          <input required placeholder="Address"
            value={form.address} onChange={e => setForm({...form, address:e.target.value})}/>

          <div className="form-section-title">HO Login</div>
          <input required placeholder="HO name"
            value={form.hoName} onChange={e => setForm({...form, hoName:e.target.value})}/>
          <input required type="email" placeholder="HO email"
            value={form.hoEmail} onChange={e => setForm({...form, hoEmail:e.target.value})}/>
          <input required type="password" placeholder="Temporary password"
            value={form.hoPassword} onChange={e => setForm({...form, hoPassword:e.target.value})}/>
          <button type="submit">Create TP & HO Login</button>
        </form>
      </section>

      <section className="card">
        <h2>Training Partners</h2>
        <Table
          columns={["Company", "PAN", "HO", "Email", "Status", "Action"]}
          rows={partners.map(p => [
            p.name,
            p.pan,
            p.ho_name,
            p.ho_email,
            <span className={`status ${p.status.toLowerCase()}`}>{p.status}</span>,
            <button className="secondary" onClick={() => toggle(p.id, p.status)}>
              {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          ])}
        />
      </section>
    </>
  );
}

function HODashboard() {
  const [centres, setCentres] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    name: "", code: "", address: "", contactPerson: "", phone: "", email: "",
    userName: "", userEmail: "", userPassword: ""
  });
  const [courseForm, setCourseForm] = useState({ name: "", fee: "" });
  const [message, setMessage] = useState("");

  const load = async () => {
    const [c, co] = await Promise.all([
      api.get("/ho/centres"),
      api.get("/ho/courses")
    ]);
    setCentres(c.data.centres);
    setCourses(co.data.courses);
  };

  useEffect(() => { load(); }, []);

  const createCentre = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ho/centres", form);
      setMessage("Centre created.");
      setForm({
        name: "", code: "", address: "", contactPerson: "", phone: "", email: "",
        userName: "", userEmail: "", userPassword: ""
      });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create centre");
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ho/courses", courseForm);
      setMessage("Course created.");
      setCourseForm({ name: "", fee: "" });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create course");
    }
  };

  const toggleCentre = async (id, status) => {
    await api.patch(`/ho/centres/${id}/status`, {
      status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    });
    load();
  };

  const mapCourse = async (centreId, courseId) => {
    try {
      await api.post(`/ho/centres/${centreId}/courses/${courseId}`);
      setMessage("Course mapped.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Mapping failed");
    }
  };

  return (
    <>
      <div className="nav-cards">
        <Link to="/dashboard" className="nav-card">Centres</Link>
        <Link to="/dashboard" className="nav-card">Courses</Link>
        <span className="nav-card disabled">Leads — later module</span>
      </div>

      <section className="card">
        <h2>Create Training Centre</h2>
        {message && <div className="alert">{message}</div>}
        <form className="grid-form" onSubmit={createCentre}>
          <input required placeholder="Centre name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <input required placeholder="Centre code" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>
          <input required placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
          <input required placeholder="Contact person" value={form.contactPerson} onChange={e=>setForm({...form,contactPerson:e.target.value})}/>
          <input required placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          <input type="email" placeholder="Centre email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>

          <div className="form-section-title">Centre Login</div>
          <input required placeholder="User name" value={form.userName} onChange={e=>setForm({...form,userName:e.target.value})}/>
          <input required type="email" placeholder="User email" value={form.userEmail} onChange={e=>setForm({...form,userEmail:e.target.value})}/>
          <input required type="password" placeholder="Temporary password" value={form.userPassword} onChange={e=>setForm({...form,userPassword:e.target.value})}/>
          <button type="submit">Create Centre & Login</button>
        </form>
      </section>

      <section className="card">
        <h2>Centres</h2>
        <Table
          columns={["Name", "Code", "Contact", "Users", "Status", "Action"]}
          rows={centres.map(c => [
            c.name, c.code, c.contact_person, c.user_count,
            <span className={`status ${c.status.toLowerCase()}`}>{c.status}</span>,
            <button className="secondary" onClick={() => toggleCentre(c.id, c.status)}>
              {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          ])}
        />
      </section>

      <section className="card">
        <h2>Course Master</h2>
        <form className="inline-form" onSubmit={createCourse}>
          <input required placeholder="Course name" value={courseForm.name} onChange={e=>setCourseForm({...courseForm,name:e.target.value})}/>
          <input required type="number" min="0" placeholder="Fee" value={courseForm.fee} onChange={e=>setCourseForm({...courseForm,fee:e.target.value})}/>
          <button type="submit">Add Course</button>
        </form>

        <Table
          columns={["Course", "Fee", "Status", "Map to Centre"]}
          rows={courses.map(co => [
            co.name,
            `₹${Number(co.fee).toLocaleString("en-IN")}`,
            <span className={`status ${co.status.toLowerCase()}`}>{co.status}</span>,
            <select defaultValue="" onChange={e => e.target.value && mapCourse(e.target.value, co.id)}>
              <option value="">Select centre</option>
              {centres.filter(c => c.status === "ACTIVE").map(c =>
                <option key={c.id} value={c.id}>{c.name}</option>
              )}
            </select>
          ])}
        />
      </section>
    </>
  );
}

function CentreDashboard() {
  const [centre, setCentre] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/centre/me"), api.get("/centre/courses")])
      .then(([c, co]) => {
        setCentre(c.data.centre);
        setCourses(co.data.courses);
      });
  }, []);

  return (
    <>
      <section className="card">
        <h2>My Training Centre</h2>
        {centre && (
          <div className="details">
            <div><b>Name</b><span>{centre.name}</span></div>
            <div><b>Code</b><span>{centre.code}</span></div>
            <div><b>Address</b><span>{centre.address}</span></div>
            <div><b>Training Partner</b><span>{centre.training_partner_name}</span></div>
            <div><b>Status</b><span className={`status ${centre.status.toLowerCase()}`}>{centre.status}</span></div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Mapped Courses</h2>
        <Table
          columns={["Course", "Fee", "Assigned"]}
          rows={courses.map(c => [
            c.name,
            `₹${Number(c.fee).toLocaleString("en-IN")}`,
            new Date(c.assigned_at).toLocaleString()
          ])}
        />
      </section>
    </>
  );
}

function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="empty">No records found</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const user = getUser();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
