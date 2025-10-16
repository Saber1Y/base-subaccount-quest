# InstaZora - Instant NFT Minting on Base

**InstaZora** is a modern NFT marketplace built for Base Sepolia that enables instant, pop-up-free minting using Base Sub Accounts with Auto Spend Permissions. Users can connect their wallet, create a funded sub account, browse Zora NFT collections, and mint NFTs without any wallet confirmation pop-ups!

## 🚀 Key Features

- **Instant Minting**: No wallet pop-ups thanks to Base Sub Accounts
- **Zora Integration**: Real NFT collections from Zora Protocol
- **Modern UI**: Responsive design with Base brand colors
- **Auto Spend Permissions**: Seamless transaction experience
- **Real-time Stats**: Dashboard showing minting activity

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Web3**: wagmi, viem, Privy Auth
- **Base**: @base-org/account (Sub Accounts), @base-org/account-ui
- **Zora**: @zoralabs/protocol-sdk
- **Network**: Base Sepolia Testnet

## 🏗 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file:

```bash
# Base Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# WalletConnect Project ID (get from walletconnect.cloud)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Privy App ID (get from privy.io)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Zora API (public endpoint)
NEXT_PUBLIC_ZORA_API_URL=https://api.zora.co/graphql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Real Zora Collections

**IMPORTANT**: Update `CURATED_COLLECTIONS` in `src/hooks/useZoraNFTs.ts` with real contract addresses.

#### Option A: Create Your Own (Recommended)

1. Visit [testnet.zora.co](https://testnet.zora.co/)
2. Connect wallet to Base Sepolia
3. Create 3-5 NFT collections
4. Add contract addresses to `useZoraNFTs.ts`

#### Option B: Find Existing Collections

```bash
npx tsx scripts/find-zora-collections.ts
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see InstaZora!

## 🎯 Usage Flow

1. **Connect Wallet**: Powered by Privy
2. **Create Sub Account**: Setup wizard with funding
3. **Browse NFTs**: Curated Zora collections
4. **Instant Mint**: No wallet pop-ups!
5. **View Stats**: Minting dashboard

## 📁 Key Files

- `src/hooks/useSubAccount.ts` - Base Sub Account logic
- `src/hooks/useZoraNFTs.ts` - Zora integration & minting
- `src/components/NFTCard.tsx` - NFT display component
- `src/app/api/zora/route.ts` - Zora API proxy

## 🔧 Adding Collections

Replace the placeholder addresses in `useZoraNFTs.ts`:

```typescript
const CURATED_COLLECTIONS = [
  {
    address: "0xYourRealContract" as Address,
    tokenIds: [1n, 2n, 3n],
    type: "1155" as const,
    fallback: {
      name: "Your Collection",
      description: "Description",
      image: "image-url",
      price: BigInt("1000000000000000"), // 0.001 ETH
    },
  },
];
```

## 🚀 Deploy on Vercel

```bash
npm run build
vercel --prod
```

**Built for the Base Builder Quest** 🔵
