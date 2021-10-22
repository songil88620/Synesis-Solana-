#!/usr/bin/env bash
#solana airdrop 10
anchor upgrade --program-id 31hDFmNChHagkuXXkVHy34BJYyQHukefAC7FstJMEK7D ./target/deploy/datafarm.so
anchor upgrade --program-id 5dwxCdRvQAJS3cdborKzp47sPVPeDRL3pdqadN4sy8dp ./target/deploy/staking.so
anchor idl upgrade --filepath ./target/idl/Datafarm.json 31hDFmNChHagkuXXkVHy34BJYyQHukefAC7FstJMEK7D
anchor idl upgrade --filepath ./target/idl/Staking.json 5dwxCdRvQAJS3cdborKzp47sPVPeDRL3pdqadN4sy8dp
