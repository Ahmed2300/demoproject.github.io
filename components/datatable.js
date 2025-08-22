class DataTable {
    constructor(tableId, filterId, paginationId, data) {
        this.table = document.getElementById(tableId);
        this.filterInput = document.getElementById(filterId);
        this.paginationControls = document.getElementById(paginationId);
        this.data = data;
        this.filteredData = data;
        this.currentPage = 1;
        this.rowsPerPage = 5;

        this.renderTable();
        this.renderPagination();
        this.addEventListeners();
    }

    renderTable() {
        const tbody = this.table.querySelector('tbody');
        tbody.innerHTML = '';

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const paginatedData = this.filteredData.slice(start, end);

        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            Object.values(item).forEach(text => {
                const cell = document.createElement('td');
                cell.textContent = text;
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
    }

    renderPagination() {
        this.paginationControls.innerHTML = '';
        const pageCount = Math.ceil(this.filteredData.length / this.rowsPerPage);

        for (let i = 1; i <= pageCount; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => {
                this.currentPage = i;
                this.renderTable();
            });
            this.paginationControls.appendChild(button);
        }
    }

    filterData() {
        const filterValue = this.filterInput.value.toLowerCase();
        this.filteredData = this.data.filter(item => {
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(filterValue)
            );
        });
        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
    }

    sortData(column) {
        this.filteredData.sort((a, b) => {
            if (a[column] < b[column]) return -1;
            if (a[column] > b[column]) return 1;
            return 0;
        });
        this.renderTable();
    }

    addEventListeners() {
        this.filterInput.addEventListener('keyup', () => this.filterData());

        this.table.querySelectorAll('th').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sortData(column);
            });
        });
    }
}
