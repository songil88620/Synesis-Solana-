const anchor = require('@project-serum/anchor');

const assert = require("assert");
const fs = require("fs");
const {
    SYSVAR_RENT_PUBKEY,
    PublicKey,
    Keypair,
    SystemProgram,
} = require("@solana/web3.js");
const {userCharge, poolVaultGen, ourCharge,vaultCharge} = require("./helper");
const splToken = require('@solana/spl-token');
const {sleep} = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
/*anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));
const data_idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/contracts.json', 'utf8')
        .toString())
const staking_idl = JSON.parse(
    require('fs')
        .readFileSync('target/idl/staking.json', 'utf8')
        .toString());
const dataId = new anchor.web3.PublicKey("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");
const stakingId = new anchor.web3.PublicKey("HgaSDFf4Vc9gWajXhNCFaAC1epszwqS2zzbAhuJpA5Ev");
const provider = anchor.getProvider();
const dataProgram = new anchor.Program(data_idl, data_idl.metadata.address, provider);
const stakingProgram = new anchor.Program(staking_idl, staking_idl.metadata.address, provider);*/

describe('datafarm', () => {
    anchor.setProvider(anchor.Provider.env());
    const provider = anchor.getProvider();
    const dataID = "31hDFmNChHagkuXXkVHy34BJYyQHukefAC7FstJMEK7D";
    const stakingID = "5dwxCdRvQAJS3cdborKzp47sPVPeDRL3pdqadN4sy8dp";
    const SNS = new anchor.web3.PublicKey("4x9tT6a8hjs6YztPJs9ZHUimQaxBetVFYTsDAAfh8Luz");
    const david = new anchor.web3.PublicKey("7aU7BDLoBQm8gmAiaDENQhbpPStzwfJPuM8a1JRhLPtv");
    const alex = new anchor.web3.PublicKey("8WQL2yB5yw9myW7Xo34sZ7eUTU2oME83BFi6Xa7Wwm1V");
    const data_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Datafarm.json', 'utf8')
            .toString())
    const staking_idl = JSON.parse(
        require('fs')
            .readFileSync('target/idl/Staking.json', 'utf8')
            .toString());
    const dataProgram = new anchor.Program(data_idl, data_idl.metadata.address, anchor.getProvider());
    const stakingProgram = new anchor.Program(staking_idl, staking_idl.metadata.address, anchor.getProvider());


    const ks_hadi = fs.readFileSync("/home/hadi/.config/solana/id.json", {encoding: 'utf8'});
    const kb_hadi = Buffer.from(JSON.parse(ks_hadi));
    let hadi = new anchor.web3.Account(kb_hadi);

    const ks_owner = fs.readFileSync("/home/hadi/.config/solana/devnet.json", {encoding: 'utf8'});
    const kb_owner = Buffer.from(JSON.parse(ks_owner));
    let owner = new anchor.web3.Account(kb_owner);


    const user = anchor.web3.Keypair.generate();
    const admin = anchor.web3.Keypair.generate();
    const customer = anchor.web3.Keypair.generate();
    const customerB = anchor.web3.Keypair.generate();
    const architect = anchor.web3.Keypair.generate();
    const architectStake = anchor.web3.Keypair.generate();
    const architectB = anchor.web3.Keypair.generate();
    const builder = anchor.web3.Keypair.generate();
    const validator = anchor.web3.Keypair.generate();
    const validatorB = anchor.web3.Keypair.generate();
    const validatorC = anchor.web3.Keypair.generate();
    const validatorD = anchor.web3.Keypair.generate();
    const validatorE = anchor.web3.Keypair.generate();
    const validatorF = anchor.web3.Keypair.generate();
    const validatorG = anchor.web3.Keypair.generate();

    const new_authority = anchor.web3.Keypair.generate();

    let architectToken = undefined;
    let architecBtToken = undefined;
    let builderToken = undefined;
    let validatorToken = undefined;
    let mint = undefined;
    let myAccount = undefined;
    let pda = undefined;
    let bump = undefined;
    let pool_vault = undefined;
    it("log users", async () => {
        console.log("\thadi: ", hadi.publicKey.toBase58());
        console.log("\tadmin : ", admin.publicKey.toBase58());
        console.log("\tarchitect : ", architect.publicKey.toBase58());
        console.log("\tbuilder : ", builder.publicKey.toBase58());
        console.log("\tvalidator : ", validator.publicKey.toBase58());
        console.log("\tcustomer : ", customer.publicKey.toBase58());
        assert.ok(true);
    }).timeout(90000);
    it("Airdrop SNS token to users", async () => {

        mint = await splToken.Token.createMint(provider.connection, owner, owner.publicKey, null, 9, splToken.TOKEN_PROGRAM_ID,)
        console.log('\tSNS Token public address: ' + mint.publicKey.toBase58());
        architectToken = await userCharge(mint, architect, owner);
        architectBToken = await userCharge(mint, architectB, owner);
        builderToken = await userCharge(mint, builder, owner);
        validatorToken = await vaultCharge(mint, validator, owner);
        await ourCharge(mint, david, owner);
        await ourCharge(mint, alex, owner);
        const [_pda, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("Staking"))],
            stakingProgram.programId
        );
        pda = _pda;
        // Mint more token to vault because we going to send reward to users
        pool_vault = await vaultCharge(mint, admin, owner);
        console.log("\tarchitect have ", architectToken.amount / 1000000000, " SNS");
        console.log("\tbuilder have ", builderToken.amount / 1000000000, " SNS");
        console.log("\tvalidator have ", validatorToken.amount / 1000000000, " SNS");
        console.log("\tvault is ", pool_vault.address.toBase58());
        assert.ok(architect.publicKey.equals(architectToken.owner));
        assert.ok(builder.publicKey.equals(builderToken.owner));
        assert.ok(validator.publicKey.equals(validatorToken.owner));
    }).timeout(90000);
    it("Creates State Pool", async () => {
        const architect_stake = new anchor.BN(20);
        const builder_stake = new anchor.BN(20);
        const validator_stake = new anchor.BN(20);
        const reward_apy = 10;
        const reward_per_block = new anchor.BN(3);
        const pool_cap = new anchor.BN(250000000);
        const penalty = new anchor.BN(2);
        await dataProgram.state.rpc.new(
            architect_stake, builder_stake, validator_stake,
            reward_apy, pool_cap, penalty, reward_per_block,
            {
                accounts: {
                    authority: admin.publicKey,
                    mint: mint.publicKey,
                    vault: pool_vault.address,
                    stakingProgram : stakingProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                signers: [admin]
            });
        let pool = await dataProgram.state.fetch();
        const change_vault = await mint.getAccountInfo(pool.vault);
        assert.ok(change_vault.owner,pda);
    }).timeout(90000);

    it("Create Campaign by architect", async () => {
        const pool = await dataProgram.state.fetch();
        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14);
        const min_builder = new anchor.BN(5);
        const min_validator = new anchor.BN(5);
        const reward_per_builder = new anchor.BN(3);
        const reward_per_validator = new anchor.BN(2);
        const validation_quorum = 64;
        const topic_domain = "my topic";
        const topic_subject = "new subject";
        const topic_explain = "here is my explain";
        const seed_phrase = "write sentence about solana";
        const CampaignSeed = 'CampaignCreate';
        await dataProgram.state.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            reward_per_builder,
            reward_per_validator,
            validation_quorum,
            topic_domain,
            topic_subject,
            topic_explain,
            seed_phrase,
            {
                accounts: {
                    campaignAccount: architect.publicKey,
                    architect: architect.publicKey,
                    pool: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await dataProgram.account.campaignAccount.createInstruction(architect),
                ],
                signers: [architect],
            });

        const campaign = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);
        console.log("\tcampaign address ", campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Architect stake to campaign", async () => {
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);
        myAccount = anchor.web3.Keypair.generate();
        await stakingProgram.rpc.stake(
            {
                accounts: {
                    stakeAccount: myAccount.publicKey,
                    user: architect.publicKey,
                    //systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: architectToken.address,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    campaign: campaignAddr,
                    poolVault: pool_vault.address,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
                instructions: [
                    await stakingProgram.account.stakeAccount.createInstruction(myAccount),
                ],
                signers: [myAccount, architect],
            });
        const stake = await stakingProgram.account.stakeAccount.fetch(myAccount.publicKey);
        assert.ok(stake.status, true)
    }).timeout(20000);

    it("Architect unstake", async () => {
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);

        await stakingProgram.rpc.unstake(
            {
                accounts: {
                    stakeAccount: myAccount.publicKey,
                    user: architect.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: architectToken.address,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    pdaAccount: pda,
                    poolVault: pool_vault.address,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        const stake = await stakingProgram.account.stakeAccount.fetch(myAccount.publicKey);

    }).timeout(20000);

    it("Create Campaign by architectB", async () => {
        const pool = await dataProgram.state.fetch();        const offChainReference = new anchor.BN(1213);
        const period = new anchor.BN(14);
        const min_builder = new anchor.BN(5);
        const min_validator = new anchor.BN(5);
        const reward_per_builder = new anchor.BN(3);
        const reward_per_validator = new anchor.BN(2);
        const validation_quorum = 64;
        const topic_domain = "my topic";
        const topic_subject = "new subject";
        const topic_explain = "here is my explain";
        const seed_phrase = "write sentence about solana";
        const CampaignSeed = 'CampaignCreate';
        await dataProgram.state.rpc.createCampaign(
            offChainReference,
            period,
            min_builder,
            min_validator,
            reward_per_builder,
            reward_per_validator,
            validation_quorum,
            topic_domain,
            topic_subject,
            topic_explain,
            seed_phrase,
            {
                accounts: {
                    campaignAccount: architectB.publicKey,
                    architect: architectB.publicKey,
                    pool: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await dataProgram.account.campaignAccount.createInstruction(architectB),
                ],
                signers: [architectB],
            });

        const campaign = await dataProgram.account.campaignAccount.fetch(architectB.publicKey);
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architectB.publicKey);
        console.log("\tcampaign address ", campaignAddr.toBase58());
        assert.ok(campaign.minBuilder.eq(min_builder));
    }).timeout(20000);
    it("Get a architect for a campaign", async () => {
        const campaign = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);
        console.log("\tArchitects for campaign : ", campaignAddr.toBase58());
        console.log("\t\tis:", campaign.architect.toBase58());
    });
    it("Get All Campaign", async () => {
        let pool = await dataProgram.state.fetch();
        let campaigns = pool.campaigns;
        for (let z = 0; z < pool.head; z++) {
            const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(campaigns[z]);
            console.log("\tarchitect ", campaigns[z].toBase58(), "\tcreated campaign ", campaignAddr.toBase58());
        }
    }).timeout(90000);

    it("Submit 3 Utterance to an ontology", async () => {
        let utterance = "hello utterance";
        let pool = await dataProgram.state.fetch();
        const campaign = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        for (i = 0; i < 3; i++) {
            const transaction = await dataProgram.rpc.utterance(
                utterance + i,
                {
                    accounts: {
                        builder: builder.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [builder]
                }
            );
        }

        const campaignData = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);
        console.log("\t", campaignData.head.toString(), " utterances submited to campaign : ", campaignAddr.toBase58());
        let utter = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[0].data));
        for (j = 0; j < campaignData.head; j++) {
            let test = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[j].data));
            console.log("\tutterance : ", test,
                " submitted by ", campaignData.utterances[j].builder.toBase58(),
                "\n\tvalidation correct :", campaignData.utterances[j].correct.toNumber(),
                "\n\tvalidation incorrect :", campaignData.utterances[j].incorrect.toNumber(),
                "\n\t and validation status :", campaignData.utterances[j].finish
            );
        }
        assert.ok(campaignData.head.toNumber() === 3);
    }).timeout(90000);

    it("validate 2 Utterance of 3 submitted", async () => {
        let pool = await dataProgram.state.fetch();
        const campaignData = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);
        let utterance0 = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[0].data));
        let utterance1 = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[1].data));
        let utterance2 = new TextDecoder("utf-8").decode(new Uint8Array(campaignData.utterances[2].data));

        // validated first submitted utterance
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validator.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validator]
                }
            );
        }
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validatorB.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validatorB]
                }
            );
        }
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validatorC.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validatorC]
                }
            );
        }
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validatorD.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validatorD]
                }
            );
        }
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validatorE.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validatorE]
                }
            );
        }
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validatorF.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validatorF]
                }
            );
        }
        if (utterance0.startsWith("hello utterance0")) {
            await dataProgram.rpc.validate(
                new anchor.BN(0),
                true,
                {
                    accounts: {
                        validator: validatorG.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validatorG]
                }
            );
        }
        // refuse second submitted utterance
        if (utterance1.startsWith("hello utterance1")) {
            await dataProgram.rpc.validate(
                new anchor.BN(1),
                true,
                {
                    accounts: {
                        validator: validator.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validator]
                }
            );
        }
        if (utterance1.startsWith("hello utterance2")) {
            await dataProgram.rpc.validate(
                new anchor.BN(1),
                true,
                {
                    accounts: {
                        validator: validator.publicKey,
                        campaignAccount: architect.publicKey,
                        pool: dataProgram.state.address(),
                        datafarm: dataProgram.programId,
                    },
                    signers: [validator]
                }
            );
        }

    }).timeout(90000);


    it("Get the current status of Ontology", async () => {
        let pool = await dataProgram.state.fetch();
        const campaign = await dataProgram.account.campaignAccount.fetch(architect.publicKey);
        for (j = 0; j < campaign.head; j++) {
            let test = new TextDecoder("utf-8").decode(new Uint8Array(campaign.utterances[j].data));
            console.log("\tutterance : ", test,
                "\n\tbuilder is ", campaign.utterances[j].builder.toBase58());
            console.log("\n\tvalidators are ");
            let num_validator = (campaign.utterances[j].correct.toNumber() + campaign.utterances[j].incorrect.toNumber());
            for (k = 0; k < num_validator; k++) {
                console.log("\t\t", campaign.utterances[j].validators[k].toBase58());
            }
            console.log("\n\tvalidation correct :", campaign.utterances[j].correct.toNumber(),
                "\n\tvalidation incorrect :", campaign.utterances[j].incorrect.toNumber(),
                "\n\tvalidation status :", campaign.utterances[j].finish
            );
        }
    }).timeout(90000);

    it("Architect unstake", async () => {
        const campaignAddr = await dataProgram.account.campaignAccount.associatedAddress(architect.publicKey);

        await stakingProgram.rpc.unstake(
            {
                accounts: {
                    stakeAccount: myAccount.publicKey,
                    user: architect.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    userToken: architectToken.address,
                    cpiState: dataProgram.state.address(),
                    datafarm: dataProgram.programId,
                    pdaAccount: pda,
                    poolVault: pool_vault.address,
                    tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                },
            });
        const stake = await stakingProgram.account.stakeAccount.fetch(myAccount.publicKey);

    }).timeout(20000);


    it("Check pool status", async () => {
        const pool = await dataProgram.state.fetch();
        console.log("\tnumber of campaign ",pool.head.toNumber());
    }).timeout(90000);

    it("Get associated token account", async () => {
       const tokenAccount = await mint.getOrCreateAssociatedAccountInfo(architect.publicKey);
       console.log("\tAssociated accout for architect is",tokenAccount.address.toBase58())
       assert.ok(tokenAccount.owner,architect.publicKey);
    }).timeout(90000);

});

