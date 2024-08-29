const db = require('../config/dbConnection');

// Function to fetch users with pagination, search, and filtering
const getUsers = (req, res) => {
  const { page = 1, limit = 15, search = '', planFilter = '' } = req.query; // Default limit is now 15
  const offset = (page - 1) * limit;

  let filterQuery = '';
  let filterParams = [];

  // Add search conditions to the filter query if search is provided
  if (search) {
    filterQuery += ` AND (username LIKE ? OR email LIKE ?)`;
    filterParams.push(`%${search}%`, `%${search}%`);
  }

  // Add plan/tier filter condition if planFilter is provided
  if (planFilter) {
    filterQuery += ` AND tier = ?`;
    filterParams.push(planFilter);
  }

  // SQL query to get the total count of users matching the filters
  const countQuery = `
    SELECT COUNT(*) AS total FROM user_table
    WHERE 1=1 ${filterQuery}
  `;

  // SQL query to get paginated user data
  const dataQuery = `
    SELECT unique_reference_id, username, email, tier, mobile_number FROM user_table
    WHERE 1=1 ${filterQuery}
    LIMIT ? OFFSET ?
  `;

  // Execute the count query to get the total number of matching users
  db.query(countQuery, filterParams, (err, results) => {
    if (err) {
      console.error("Error fetching user count:", err);
      return res.status(500).json({ error: "Error fetching user count" });
    }

    const totalCount = results[0].total;

    // Execute the data query to get the user data for the current page
    db.query(dataQuery, [...filterParams, Number(limit), Number(offset)], (err, users) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Error fetching users" });
      }

      // Return the user data and total count to the frontend
      res.json({ data: users, total: totalCount });
    });
  });
};

module.exports = { getUsers };
