import { Layout, Typography, Card, ConfigProvider } from "antd";

const { Header, Content } = Layout;

// 占位骨架 (Phase 0)。Phase 1 接入商品表格 / 录入表单 / 图片上传 / 上下架与库存。
export default function App() {
  return (
    <ConfigProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <Header>
          <Typography.Title level={4} style={{ color: "#fff", margin: 0, lineHeight: "64px" }}>
            装箱管理后台 · admin-web
          </Typography.Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card title="Phase 0 骨架已就绪">
            <Typography.Paragraph>
              下一步 (Phase 1)：商品 CRUD 表格、录入/编辑表单、缩略图上传、库存与上下架管理。
            </Typography.Paragraph>
          </Card>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
