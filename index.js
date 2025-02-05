import { compile, createFileManager } from "@noir-lang/noir_wasm"

import main from "./circuit/src/main.nr?url";
import nargoToml from "./circuit/Nargo.toml?url";
import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';

import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);

import { connect, disconnect } from "starknetkit";

const connectWallet = async () => {
    try {
        const { wallet, connectorData } = await connect({
            modalMode: "alwaysAsk",
            modalTheme: "light",
            webWalletUrl: "https://web.argent.xyz",
            argentMobileOptions: {
                dappName: "My Noir Dapp",
                projectId: "YOUR_PROJECT_ID", // Wpisz swój WalletConnect Project ID
                chainId: "SN_MAIN", // lub "SN_GOERLI" dla testnetu
                url: window.location.hostname,
                icons: ["https://your-icon-url.com"],
                rpcUrl: "YOUR_RPC_URL",
            },
        });

        if (wallet && connectorData) {
            console.log("Połączono z:", connectorData.account);
            document.getElementById("wallet-address").textContent = `Adres: ${connectorData.account}`;
        } else {
            console.log("Nie udało się połączyć z Argent Wallet");
        }
    } catch (error) {
        console.error("Błąd podczas łączenia z Argent Wallet:", error);
    }
};

const disconnectWallet = async () => {
    await disconnect();
    console.log("Portfel odłączony");
    document.getElementById("wallet-address").textContent = "Adres: brak";
};

export async function getCircuit() {
    const fm = createFileManager("/");
    const { body } = await fetch(main);
    const { body: nargoTomlBody } = await fetch(nargoToml);

    fm.writeFile("./src/main.nr", body);
    fm.writeFile("./Nargo.toml", nargoTomlBody);
    return await compile(fm);
}

const show = (id, content) => {
    const container = document.getElementById(id);
    container.appendChild(document.createTextNode(content));
    container.appendChild(document.createElement("br"));
};

document.getElementById("submit").addEventListener("click", async () => {
    try {
        const { program } = await getCircuit();
        const noir = new Noir(program);
        const backend = new UltraHonkBackend(program.bytecode);
        const age = document.getElementById("age").value;
        show("logs", "Generating witness... ⏳");
        const { witness } = await noir.execute({ age });
        show("logs", "Generated witness... ✅");
        show("logs", "Generating proof... ⏳");
        const proof = await backend.generateProof(witness);
        show("logs", "Generated proof... ✅");
        show("results", proof.proof);
    } catch {
        show("logs", "Oh 💔");
    }
});

document.getElementById("connect-wallet").addEventListener("click", connectWallet);
document.getElementById("disconnect-wallet").addEventListener("click", disconnectWallet);
