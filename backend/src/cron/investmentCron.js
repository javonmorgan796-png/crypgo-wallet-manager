const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { notifyBalanceUpdate } = require('../websocket/balanceUpdates');

// Process matured investments
const processMaturedInvestments = async () => {
  console.log('🔄 Running investment maturity check...');
  
  try {
    const now = new Date();
    
    // Find all active investments that have passed their end date
    const maturedInvestments = await Investment.find({
      status: 'active',
      endDate: { $lte: now }
    }).populate('user');
    
    console.log(`📊 Found ${maturedInvestments.length} matured investments`);
    
    for (const investment of maturedInvestments) {
      try {
        // Calculate final return
        const profit = investment.expectedReturn - investment.amount;
        
        // Update investment status
        investment.status = 'completed';
        investment.completedAt = now;
        investment.actualReturn = investment.expectedReturn;
        await investment.save();
        
        // Update user balance
        const user = await User.findById(investment.user._id);
        if (!user) {
          console.error(`User not found for investment ${investment._id}`);
          continue;
        }
        
        const previousBalance = user.balance;
        user.balance += investment.expectedReturn;
        user.totalProfit = (user.totalProfit || 0) + profit;
        user.totalInvested = Math.max(0, (user.totalInvested || 0) - investment.amount);
        await user.save();
        
        // Create profit transaction
        await Transaction.create({
          user: user._id,
          type: 'profit',
          amount: profit,
          status: 'completed',
          description: `${investment.planName} matured - Principal + Profit`,
          reference: `MAT-${investment._id.toString().slice(-8).toUpperCase()}`
        });
        
        // Create principal return transaction
        await Transaction.create({
          user: user._id,
          type: 'investment-return',
          amount: investment.amount,
          status: 'completed',
          description: `${investment.planName} principal returned`,
          reference: `RET-${investment._id.toString().slice(-8).toUpperCase()}`
        });
        
        // Send notification
        await Notification.create({
          user: user._id,
          title: 'Investment Completed! 🎉',
          message: `Your ${investment.planName} has matured! $${investment.expectedReturn.toFixed(2)} (including $${profit.toFixed(2)} profit) has been added to your balance.`,
          type: 'investment'
        });
        
        // Send real-time balance update via WebSocket
        notifyBalanceUpdate(user._id.toString(), {
          balance: user.balance,
          previousBalance,
          transaction: {
            type: 'investment-matured',
            amount: investment.expectedReturn,
            profit,
            status: 'completed'
          },
          message: `Your ${investment.planName} has matured! +$${profit.toFixed(2)} profit`
        });
        
        console.log(`✅ Processed investment ${investment._id} for user ${user.email}: +$${investment.expectedReturn}`);
      } catch (investmentError) {
        console.error(`Error processing investment ${investment._id}:`, investmentError);
      }
    }
    
    console.log('✅ Investment maturity check completed');
    return maturedInvestments.length;
  } catch (error) {
    console.error('❌ Error in investment maturity cron:', error);
    throw error;
  }
};

// Simulate copy trade profits (run periodically)
const simulateCopyTradeProfits = async () => {
  console.log('🔄 Running copy trade profit simulation...');
  
  try {
    const CopyTrade = require('../models/CopyTrade');
    const Trader = require('../models/Trader');
    
    // Get all active copy trades
    const activeCopies = await CopyTrade.find({ status: 'active' }).populate('trader');
    
    for (const copy of activeCopies) {
      if (!copy.trader) continue;
      
      // Simulate daily profit based on trader's win rate and monthly returns
      const dailyReturnRate = (copy.trader.profitPercentage / 365) / 100;
      const volatility = copy.trader.riskLevel === 'high' ? 0.5 : copy.trader.riskLevel === 'medium' ? 0.3 : 0.1;
      
      // Random factor between -volatility and +volatility
      const randomFactor = 1 + (Math.random() * 2 - 1) * volatility;
      const dailyReturn = copy.amount * dailyReturnRate * randomFactor;
      
      // Update copy trade values
      copy.currentValue += dailyReturn;
      copy.profit = copy.currentValue - copy.amount;
      copy.profitPercentage = ((copy.currentValue - copy.amount) / copy.amount) * 100;
      
      // Check stop loss
      if (copy.profitPercentage <= -copy.settings.stopLoss) {
        copy.status = 'stopped';
        copy.endDate = new Date();
        
        // Return remaining funds to user
        const user = await User.findById(copy.user);
        if (user) {
          user.balance += copy.currentValue;
          await user.save();
          
          await Notification.create({
            user: user._id,
            title: 'Copy Trade Stopped',
            message: `Your copy trade with ${copy.trader.name} was stopped due to stop-loss at ${copy.profitPercentage.toFixed(2)}%`,
            type: 'trade'
          });
        }
      }
      
      // Check take profit
      if (copy.profitPercentage >= copy.settings.takeProfit) {
        copy.status = 'stopped';
        copy.endDate = new Date();
        
        // Return funds with profit to user
        const user = await User.findById(copy.user);
        if (user) {
          user.balance += copy.currentValue;
          user.totalProfit = (user.totalProfit || 0) + copy.profit;
          await user.save();
          
          await Notification.create({
            user: user._id,
            title: 'Copy Trade Completed! 🎉',
            message: `Your copy trade with ${copy.trader.name} reached take-profit! +$${copy.profit.toFixed(2)}`,
            type: 'trade'
          });
        }
      }
      
      await copy.save();
    }
    
    console.log(`✅ Processed ${activeCopies.length} copy trades`);
    return activeCopies.length;
  } catch (error) {
    console.error('❌ Error in copy trade simulation:', error);
    throw error;
  }
};

// Start cron jobs
const startCronJobs = () => {
  // Check for matured investments every hour
  setInterval(() => {
    processMaturedInvestments().catch(console.error);
  }, 60 * 60 * 1000); // Every hour
  
  // Simulate copy trade profits every 6 hours
  setInterval(() => {
    simulateCopyTradeProfits().catch(console.error);
  }, 6 * 60 * 60 * 1000); // Every 6 hours
  
  // Run initial checks on startup (after 30 seconds to let DB connect)
  setTimeout(() => {
    processMaturedInvestments().catch(console.error);
    simulateCopyTradeProfits().catch(console.error);
  }, 30000);
  
  console.log('📅 Cron jobs started');
};

module.exports = {
  processMaturedInvestments,
  simulateCopyTradeProfits,
  startCronJobs
};
