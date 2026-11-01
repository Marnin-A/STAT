import { NavLink } from "react-router-dom";
import { Icon } from "../ui/Icon";
export function BottomNavBar() {
  return (
    <nav className="bottom-nav safe-area-bottom" aria-label="Main navigation">
      {(
        [
          { to: "/", label: "Home", icon: "home" },
          { to: "/activity", label: "Activity", icon: "activity" },
          { to: "/profile", label: "Profile", icon: "user" },
        ] as const
      ).map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
