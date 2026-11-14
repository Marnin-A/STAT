import { Icon } from "../ui/Icon";
import { useDemo } from "../../demo/DemoProvider";
export function TopAppBar() {
  const demo = useDemo();
  return (
    <header className="app-header safe-area-top">
      <a href="/" className="wordmark" aria-label="STAT Home">
        <Icon name="star" />
        <span>STAT</span>
      </a>
      <a className="guest" href="/profile">
        <Icon name="user" />
        {demo ? demo.user.name : "Guest"}
      </a>
    </header>
  );
}
