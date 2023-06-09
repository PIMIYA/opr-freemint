import {
  ConnectWallet,
  useAddress,
  useNetwork,
  useNetworkMismatch,
  ChainId,
  Web3Button,
  useContract,
  useContractMetadata,
  useClaimConditions,
  useActiveClaimConditionForWallet,
  useClaimerProofs,
  useClaimIneligibilityReasons,
  useTotalCirculatingSupply,
} from "@thirdweb-dev/react";
import type { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { useEffect, useMemo, useState } from "react";
import { BigNumber, utils } from "ethers";
import { parseIneligibility } from "../utils/parseIneligibility";
import { useMagic } from "@thirdweb-dev/react/evm/connectors/magic";

import Image from "next/image";
import ImageUploading, { ImageListType } from "react-images-uploading";

// firebase
import { ulid } from "ulid";
import { doc, collection, setDoc, addDoc } from "firebase/firestore";
import { getDownloadURL, uploadBytes, ref } from "firebase/storage";
import { fsApp, fsDatabase, fsStorage } from "../storage/fs";

// Put Your Edition Drop Contract address from the dashboard here
const myEditionDropContractAddress =
  "0x6D209B613A1Da8bBAF67f42fe98Cb0b6b0Faa4Bd";

// Put your token ID here
const tokenId = 0;

// const uploadProof = async (
//   address: string | undefined,
//   file: File,
//   id?: string | undefined
// ) => {
//   const storageRef = ref(fsStorage, ulid());
//   try {
//     let uploadResult = await uploadBytes(storageRef, file);
//     let url = await getDownloadURL(uploadResult.ref);

//     let data = {
//       address: address,
//       imgUrl: url,
//     };

//     if (id === undefined) {
//       await addDoc(collection(fsDatabase, "pics"), data);
//     } else {
//       const docRef = doc(fsDatabase, "pics", id);
//       await setDoc(docRef, data, { merge: true });
//     }
//   } catch (error) {
//     console.error(error);
//   }
// };

const Home: NextPage = () => {
  const address = useAddress();
  const [quantity, setQuantity] = useState(1);
  const { contract: editionDrop } = useContract(myEditionDropContractAddress);
  const { data: contractMetadata } = useContractMetadata(editionDrop);

  const [, switchNetwork] = useNetwork();
  const isWrongNetwork = useNetworkMismatch();

  // const connectWithMagic = useMagic(); // Hook to connect with Magic Link.
  // const [email, setEmail] = useState<string>(""); // State to hold the email address the user entered.

  // for upload image
  const [images, setImages] = useState<ImageListType>([]);
  const maxNumber = 1;

  // const onUploadImageChange = (
  //   imageList: ImageListType,
  //   addUpdateIndex: number[] | undefined
  // ) => {
  //   // data for submit
  //   console.log(imageList, addUpdateIndex);
  //   setImages(imageList);
  // };

  const claimConditions = useClaimConditions(editionDrop);
  const activeClaimCondition = useActiveClaimConditionForWallet(
    editionDrop,
    address,
    tokenId
  );
  const claimerProofs = useClaimerProofs(editionDrop, address || "", tokenId);
  const claimIneligibilityReasons = useClaimIneligibilityReasons(
    editionDrop,
    {
      quantity,
      walletAddress: address || "",
    },
    tokenId
  );

  const claimedSupply = useTotalCirculatingSupply(editionDrop, tokenId);

  const totalAvailableSupply = useMemo(() => {
    try {
      return BigNumber.from(activeClaimCondition.data?.availableSupply || 0);
    } catch {
      return BigNumber.from(1_000_000);
    }
  }, [activeClaimCondition.data?.availableSupply]);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    const n = totalAvailableSupply.add(BigNumber.from(claimedSupply.data || 0));
    if (n.gte(1_000_000)) {
      return "";
    }
    return n.toString();
  }, [totalAvailableSupply, claimedSupply]);

  const priceToMint = useMemo(() => {
    const bnPrice = BigNumber.from(
      activeClaimCondition.data?.currencyMetadata.value || 0
    );
    return `${utils.formatUnits(
      bnPrice.mul(quantity).toString(),
      activeClaimCondition.data?.currencyMetadata.decimals || 18
    )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    let max;
    if (totalAvailableSupply.lt(bnMaxClaimable)) {
      max = totalAvailableSupply;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000)) {
      return 1_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    totalAvailableSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0
          )) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return (
      activeClaimCondition.isLoading || claimedSupply.isLoading || !editionDrop
    );
  }, [activeClaimCondition.isLoading, editionDrop, claimedSupply.isLoading]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );
  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      if (pricePerToken.eq(0)) {
        return "Mint (Free)";
      }
      return `Mint (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Claiming not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  useEffect(() => {
    if (isWrongNetwork && switchNetwork) {
      setTimeout(() => {
        switchNetwork(ChainId.Polygon);
      }, 1000);
    }
  }, [address, isWrongNetwork, switchNetwork]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.mintInfoContainer}>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className={styles.infoSide}>
                {/* Title of your NFT Collection */}
                <h1>{contractMetadata?.name}</h1>
                {/* Description of your NFT Collection */}
                <p className={styles.description}>
                  {contractMetadata?.description}
                </p>
                <div className={styles.connect}>
                  <ConnectWallet
                    accentColor={isWrongNetwork ? "grey" : "navy"}
                    colorMode="dark"
                    btnTitle="Connect Wallet"
                  />
                </div>

                {/* {!canClaim ? (
                  <><h2 style={{ fontSize: "1.0rem" }}>or</h2><h2 style={{ fontSize: "1.0rem" }}>Login With Email</h2><div
                    style={{
                      width: 360,
                      maxWidth: "90vw",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 16,
                    }}
                  >
                    <input
                      type="email"
                      placeholder="Your Email Address"
                      className={styles.textInput}
                      style={{ width: "90%", marginBottom: 0 }}
                      onChange={(e) => setEmail(e.target.value)} />

                    <a
                      className={styles.mainButton}
                      onClick={() => {
                        connectWithMagic({ email });
                      }}
                    >
                      Login
                    </a>
                  </div></>
                ) : null} */}

                {/* upload feqture */}

                {/* <div
                  style={{
                    width: 360,
                    maxWidth: "90vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    marginTop: "5px",
                  }}
                >
                  {canClaim ? (
                    <ImageUploading
                      value={images}
                      onChange={onUploadImageChange}
                      maxNumber={maxNumber}
                    >
                      {({
                        imageList,
                        onImageUpload,
                        onImageRemoveAll,
                        onImageUpdate,
                        onImageRemove,
                        isDragging,
                        dragProps,
                      }) => (

                        <div>
                          <p style={{ fontSize: "1.0rem", textAlign: "center" }}>Upload your image</p>
                          <p style={{ fontSize: "1.0rem", textAlign: "center" }}>for Claiming Free NFTs.</p>
                          <button
                            className={styles.mainButton}
                            onClick={
                              imageList.length === 0
                                ? onImageUpload
                                : () => onImageUpdate(0)
                            }
                          >
                            Select Photo
                          </button>
                          {imageList.map((image, index) => (
                            <div key={index}>
                              <Image
                                src={image.dataURL ?? ""}
                                alt=""
                                width={100}
                                height={100}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </ImageUploading>

                  ) : (
                    <></>
                  )}
                </div> */}
              </div>

              <div className={styles.imageSide}>
                {/* Image Preview of NFTs */}
                <img
                  className={styles.image}
                  src={contractMetadata?.image}
                  alt={`${contractMetadata?.name} preview image`}
                />

                {/* Amount claimed so far */}
                <div className={styles.mintCompletionArea}>
                  <div className={styles.mintAreaLeft}>
                    <p>Total Minted</p>
                  </div>
                  <div className={styles.mintAreaRight}>
                    {claimedSupply ? (
                      <p>
                        <b>{numberClaimed}</b>
                        {" / "}
                        {numberTotal || "∞"}
                      </p>
                    ) : (
                      // Show loading state if we're still loading the supply
                      <p>Loading...</p>
                    )}
                  </div>
                </div>

                {claimConditions.data?.length === 0 ||
                  claimConditions.data?.every(
                    (cc) => cc.maxClaimableSupply === "0"
                  ) ? (
                  <div>
                    <h2>
                      This drop is not ready to be minted yet. (No claim
                      condition set)
                    </h2>
                  </div>
                ) : (
                  <>
                    {/* <p>Quantity</p>
                    <div className={styles.quantityContainer}>
                      <button
                        className={`${styles.quantityControlButton}`}
                        onClick={() => setQuantity(quantity - 1)}
                        disabled={quantity <= 1}
                      >
                        -
                      </button>

                      <h4>{quantity}</h4>

                      <button
                        className={`${styles.quantityControlButton}`}
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={quantity >= maxClaimable}
                      >
                        +
                      </button>
                    </div> */}

                    <div className={styles.mintContainer}>
                      {isSoldOut ? (
                        <div>
                          <h2>Sold Out</h2>
                        </div>
                      ) : (
                        <Web3Button
                          contractAddress={editionDrop?.getAddress() || ""}
                          // action={(contract) => {
                          //   const img = images.at(0);
                          //   if (img === undefined) {
                          //     alert("Please upload the photo first");
                          //     return;
                          //   }

                          //   await uploadProof(address, img.file!);
                          //   contract.erc1155.claim(tokenId, quantity);
                          // }}
                          action={(contract) =>
                            contract.erc1155.claim(tokenId, quantity)
                          }
                          isDisabled={!canClaim || buttonLoading}
                          onError={(err) => {
                            console.error(err);
                            alert("Error claiming NFTs");
                          }}
                          onSuccess={() => {
                            setQuantity(1);
                            alert("Successfully claimed NFTs");
                          }}
                        >
                          {buttonLoading ? "Loading..." : buttonText}
                        </Web3Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
