###Expenses 
This is the output I get when I add a new expense localhost:5173 says
![alt text](image.png)
    Expense added successfully!

    Amount: Ksh 60.00
    Fee: KshNaN
    Total: KshNaN
Error saving expense: new row for relation "account_transactions" violates check constraint "account_transactions_transaction_type_check"
![alt text](image-2.png)

On Message parser the system should pick the correct transaction fee based on the mesage (Transaction Cost) instead of icking the MPesa Balance.
![alt text](image-3.png)

Let's have uniform notifications across the system whether it's an error or success on an action. Also the notifications icon should contain notiications from the system, is it operational if i click the notification icon?



###Income 
Error: Error saving income: Could not find the 'statutory_deductions' column of 'income' in the schema cache

![alt text](image-1.png)


###Budget
I cannot create budgets error below from browser inspect dev tool
        Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
        ojigypxfwwxlcpuyjjlw.supabase.co/rest/v1/account_transactions?select=*%2Cfrom_account%3Aaccounts%21account_transactions_from_account_id_fkey%28name%2Caccount_type%29%2Cto_account%3Aaccounts%21account_transactions_to_account_id_fkey%28name%2Caccount_type%29&user_id=eq.e11331b0-4048-448a-a045-07ff3c55e4c6&or=%28from_account.account_type.in.%28savings%2Cinvestment%29%2Cto_account.account_type.in.%28savings%2Cinvestment%29%29&order=date.desc&limit=10:1  Failed to load resource: the server responded with a status of 400 ()
        SavingsInvestments.jsx:151 Error fetching transactions: Object
        fetchRecentTransactions @ SavingsInvestments.jsx:151
        ojigypxfwwxlcpuyjjlw.supabase.co/rest/v1/account_transactions?select=*%2Cfrom_account%3Aaccounts%21account_transactions_from_account_id_fkey%28name%2Caccount_type%29%2Cto_account%3Aaccounts%21account_transactions_to_account_id_fkey%28name%2Caccount_type%29&user_id=eq.e11331b0-4048-448a-a045-07ff3c55e4c6&or=%28from_account.account_type.in.%28savings%2Cinvestment%29%2Cto_account.account_type.in.%28savings%2Cinvestment%29%29&order=date.desc&limit=10:1  Failed to load resource: the server responded with a status of 400 ()
        SavingsInvestments.jsx:151 Error fetching transactions: Object
        fetchRecentTransactions @ SavingsInvestments.jsx:151
        ojigypxfwwxlcpuyjjlw.supabase.co/rest/v1/account_transactions?select=*%2Cfrom_account%3Afrom_account_id%28id%2Cname%2Caccount_type%29%2Cto_account%3Ato_account_id%28id%2Cname%2Caccount_type%29&or=%28from_account_id.in.%28%29%2Cto_account_id.in.%28%29%29&order=transaction_date.desc&limit=500:1  Failed to load resource: the server responded with a status of 400 ()
        AccountHistory.jsx:113 Error fetching transactions: Object
        fetchTransactions @ AccountHistory.jsx:113
        ojigypxfwwxlcpuyjjlw.supabase.co/rest/v1/account_transactions?select=*%2Cfrom_account%3Afrom_account_id%28id%2Cname%2Caccount_type%29%2Cto_account%3Ato_account_id%28id%2Cname%2Caccount_type%29&or=%28from_account_id.in.%28%29%2Cto_account_id.in.%28%29%29&order=transaction_date.desc&limit=500:1  Failed to load resource: the server responded with a status of 400 ()
        AccountHistory.jsx:113 Error fetching transactions: Object
        fetchTransactions @ AccountHistory.jsx:113
        react-dom_client.js?v=fc7bcef6:4598 Uncaught Error: Objects are not valid as a React child (found: object with keys {$$typeof, render}). If you meant to render a collection of children, use an array instead.
            at throwOnInvalidObjectTypeImpl (react-dom_client.js?v=fc7bcef6:4598:15)
            at throwOnInvalidObjectType (react-dom_client.js?v=fc7bcef6:4606:13)
            at createChild (react-dom_client.js?v=fc7bcef6:4784:13)
            at reconcileChildrenArray (react-dom_client.js?v=fc7bcef6:4965:26)
            at reconcileChildFibersImpl (react-dom_client.js?v=fc7bcef6:5171:88)
            at react-dom_client.js?v=fc7bcef6:5237:35
            at reconcileChildren (react-dom_client.js?v=fc7bcef6:7182:53)
            at beginWork (react-dom_client.js?v=fc7bcef6:8701:104)
            at runWithFiberInDEV (react-dom_client.js?v=fc7bcef6:997:72)
            at performUnitOfWork (react-dom_client.js?v=fc7bcef6:12561:98)
        react-dom_client.js?v=fc7bcef6:6966 An error occurred in the <option> component.

        Consider adding an error boundary to your tree to customize error handling behavior.
        Visit https://react.dev/link/error-boundaries to learn more about error boundaries.

        defaultOnUncaughtError @ react-dom_client.js?v=fc7bcef6:6966

###Dark mode issues 
Pages not in dark mode 

###Unfixed - Comment: You have not Addressed the below issues
    ![dasboard](image-10.png)

    ![dasboard](image-11.png)

    ![accounts history](image-12.png)

    ![calculator](image-13.png)

    ![goals](image-14.png) - is there a better way to implement the action buttons in a  darkmode way - you can cascade across the entire application maintain fluent light and dark theme

    ![comprehensive reports](image-15.png)

    ![comprehensive reports](image-16.png)


###Next  Actions
    - Adding income has an issue attached is the screenshot - ![income](image-17.png)
    - Find a better way to combine reports and comprehensive report
    - Analyse the functionality and logic of the budget section, explain in details how this ties or relates directly on expenses and also on accounts. Under the AI section of the budget so far I am not sureconvinced it's doing what's it's suppossed to work let's discuss on that so that we have a better implementation way, share your thinking logically on this and give a complete example for it.
    - Let's maintain one button that switches between light and dark mode 
    - Let's do proper form update on expenses for instance If I select MPesa Wallet it should by default have method of payment as MPesa and Fee calculations should provide the available MPesa options same to any other bank. Also have a look at 


#### Vercel Is not allowing automated updates pushed to vessel
