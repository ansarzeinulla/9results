import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="brand">results.togyz</NavLink>
      <div className="nav-links">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/tournaments">Tournaments</NavLink>
        <NavLink to="/players">Players</NavLink>
        <NavLink to="/login" className="login-link">Organizer Login</NavLink>
      </div>
    </nav>
  );
}
