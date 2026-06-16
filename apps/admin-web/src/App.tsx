import { Button, Layout, Spin, Typography } from "antd";

import { useAuth } from "./auth";
import LoginPage from "./pages/LoginPage";
import ProductsPage from "./pages/ProductsPage";

const { Header, Content } = Layout;

export default function App() {
  const { user, ready, logout } = useAuth();

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
          装箱管理后台
        </Typography.Title>
        <span style={{ color: "rgba(255,255,255,0.85)" }}>
          {user.username}（{user.role}）
          <Button type="link" onClick={logout} style={{ color: "#fff", paddingLeft: 8 }}>
            退出
          </Button>
        </span>
      </Header>
      <Content style={{ padding: 24 }}>
        <ProductsPage />
      </Content>
    </Layout>
  );
}
