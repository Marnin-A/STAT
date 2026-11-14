import { Link } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { useDemo } from "../../demo/DemoProvider";
export function TopAppBar() {
  const demo = useDemo();
  return (
    <header className="app-header safe-area-top">
      <Link to="/" className="wordmark" aria-label="STAT Home">
        <Icon name="star" />
        <span>STAT</span>
      </Link>
      <Link className="guest" to="/profile">
        <Icon name="user" />
        {demo ? demo.user.name : "Guest"}
      </Link>
    </header>
  );
}
