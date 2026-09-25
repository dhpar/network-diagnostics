import Layout from '../Layout';
import { createFileRoute } from "@tanstack/react-router";
import SuspenseWrapper from "../components/States/SuspenseWrapper";
import { TracerouteTable } from "../components/TracerouteTable/TracerouteTable";

export const Route = createFileRoute('/Traceroute')({
  component: () => (
    <Layout title={'Traceroute'}>
        <SuspenseWrapper message="There was an error loading the traceroute" isATableLoading={true}>
            <TracerouteTable />
        </SuspenseWrapper>
    </Layout>
    )
});
