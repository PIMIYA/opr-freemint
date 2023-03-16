import {
  ConnectWallet,
  useAddress,
  useNetwork,
  useNetworkMismatch,
  ChainId,
  Web3Button
} from "@thirdweb-dev/react";
import type { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { useEffect } from "react";

const Home: NextPage = () => {

  const address = useAddress();
  const [, switchNetwork] = useNetwork();
  const isWrongNetwork = useNetworkMismatch();

  const contractAddress = "0x110CA23E1Ef5971aC87ba4C8E9E770dbb2E47bEd";


  useEffect(() => {
    if (isWrongNetwork && switchNetwork) {
      setTimeout(() => {
        switchNetwork(ChainId.Mumbai);
      }, 2000);
    }
  }, [address, isWrongNetwork, switchNetwork]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          OPR Free Mint!
        </h1>

        <p className={styles.description}>
          testing OPR free mint feature.
        </p>

        <div className={styles.connect}>
          <ConnectWallet
            accentColor={isWrongNetwork ? "grey" : "navy"}
            colorMode="dark"
            btnTitle="Connect Wallet"
          />
        </div>
        <div style={{ marginTop: "10px" }}>
          {isWrongNetwork ? <p>Wrong Network, Please switchNetwork!!!</p> : <p></p>}
          {useAddress() ? <p>Address: {address}</p> : <p></p>}
        </div>
        <div style={{ marginTop: "10px" }}>
          <Web3Button
            contractAddress={contractAddress}
            action={(contract) => {
              contract.erc721.claim(1);
            }}
            onSuccess={() => alert("Claimed NFT!")}
            onError={(err) => alert(err)}
          >
            Claim NFT
          </Web3Button>
        </div>
      </main >
    </div >
  );
};

export default Home;
