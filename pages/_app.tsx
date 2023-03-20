import type { AppProps } from "next/app";
import { ChainId, ThirdwebProvider, } from "@thirdweb-dev/react";
import Head from "next/head";
import "../styles/globals.css";
import { MagicConnector } from "@thirdweb-dev/react/evm/connectors/magic";

// This is the chain your dApp will work on.
// Change this to the chain your app is built for.
// You can also import additional chains from `@thirdweb-dev/chains` and pass them directly.

const activeChainId = ChainId.Polygon;



// const magicLinkConnector = new MagicConnector({
//   options: {
//     apiKey: process.env.NEXT_PUBLIC_MAGIC_LINK_API_KEY as string,
//     rpcUrls: {
//       [ChainId.Mumbai]: "https://rpc-mumbai.maticvigil.com",
//     },
//   },
// });

// const connectors = [
//   "metamask",
//   "walletConnect",
//   "walletLink",
//   magicLinkConnector
//   // {
//   //   name: "magic",
//   //   options: {
//   //     apiKey: process.env.NEXT_PUBLIC_MAGIC_LINK_API_KEY as string,
//   //   }
//   // }
// ]
function MyApp({ Component, pageProps }: AppProps) {

  return (
    <ThirdwebProvider
      sdkOptions={{
        gasless: {
          openzeppelin: {
            relayerUrl: process.env.NEXT_PUBLIC_OPENZEPPELIN_URL as string,
            // relayerForwarderAddress: process.env.PUBLIC_RELAYER_FORWARDER_ADDRESS,
            // relayerApiKey: process.env.PUBLIC_RELAYER_API_KEY,
          },
        },
      }}
      activeChain="polygon"
    // walletConnectors={connectors as Array<any>}
    >
      <Head>
        <title>KAIROS.2023</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="KAIROS.2023"
        />
        <meta
          name="keywords"
          content="KAIROS.2023 NCCU 23th Art Residency Opening Performance"
        />
      </Head>
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
}

export default MyApp;
