use anchor_lang::prelude::*;
use anchor_lang::Account;
use anchor_spl::token::{self, Burn, Mint, MintTo, TokenAccount, Transfer, ID};

use datafarm::Datafarm::PoolConfig as Pool;
use datafarm::{self, PoolAccount};

#[program]
pub mod Staking {
    use super::*;

    const PDA_SEED: &[u8] = b"Staking";

    pub fn stake(ctx: Context<InitStake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_init()?;
        let state = &mut ctx.accounts.cpi_state;
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let stake_amount = state.architect_stake.checked_mul(1000_000_000).unwrap();
        match token::transfer(cpi_ctx, stake_amount) {
            Ok(res) => {}
            Err(e) => {
                msg!("error is {:?}", e);
            }
        }
        stake.token_amount += stake_amount;
        stake.start_block = ctx.accounts.clock.slot;
        stake.lock_in_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = 0;
        stake.user_address = ctx.accounts.user_token.key();
        stake.status = true;
        //
        msg!(
            "{{ \"event\" : \"stake\",\
            \"amount\" : \"{}\",\
            \"start_block\" : \"{}\",\
            \"start_time\" : \"{}\"\
          }}",
            stake.token_amount,
            stake.start_block,
            stake.lock_in_time
        );
        Ok(())
    }

    pub fn unstake(ctx: Context<CloseStake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        stake.token_amount = stake.token_amount.checked_sub(stake.token_amount).unwrap();
        stake.end_block = ctx.accounts.clock.slot;
        stake.lock_out_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = stake
            .end_block
            .checked_sub(stake.start_block).unwrap()
            .checked_mul(state.reward_per_block).unwrap();
        stake.status = false;
        let token_and_reward = stake.pending_reward
            .checked_add(stake.token_amount).unwrap()
            .checked_mul(1_000_000_000).unwrap();
        token::transfer(
            ctx.accounts.to_taker().with_signer(&[&seeds[..]]),
            token_and_reward,
        )?;

        Ok(())
    }
}

impl<'info> CloseStake<'info> {
    fn to_taker(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.pool_vault.to_account_info().clone(),
            to: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct InitStake<'info> {
    #[account(zero)]
    stake_account: Loader<'info, stakeAccount>,
    #[account(signer)]
    user: AccountInfo<'info>,
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut, state = datafarm)]
    pub cpi_state: CpiState<'info, Pool>,
    #[account(executable)]
    pub datafarm: AccountInfo<'info>,
    pub campaign: AccountInfo<'info>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(constraint = token_program.key == & token::ID)]
    token_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct CloseStake<'info> {
    #[account(mut)]
    stake_account: Loader<'info, stakeAccount>,
    user: AccountInfo<'info>,
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    pda_account: AccountInfo<'info>,
    #[account(mut, state = datafarm)]
    cpi_state: CpiState<'info, Pool>,
    #[account(executable)]
    datafarm: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
}

#[account(zero_copy)]
pub struct stakeAccount {
    pub token_amount: u64,
    pub lock_in_time: i64,
    pub start_block: u64,
    pub lock_out_time: i64,
    pub end_block: u64,
    pub weight: u64,
    pub pending_reward: u64,
    pub status: bool,
    pub token_address: Pubkey,
    pub user_address: Pubkey,
}

impl<'a, 'b, 'c, 'info> From<&InitStake<'info>> for CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
    fn from(accounts: &InitStake<'info>) -> CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: accounts.user_token.to_account_info(),
            to: accounts.pool_vault.to_account_info(),
            authority: accounts.user.to_account_info(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}
